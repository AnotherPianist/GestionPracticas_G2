import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Hidden,
  TextField,
  Typography,
  Slide
} from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaWpforms } from 'react-icons/fa';
import { FiDownload } from 'react-icons/fi';
import { IoDocumentAttachOutline } from 'react-icons/io5';
import { makeStyles } from '@material-ui/core/styles';
import useAuth from '../../providers/Auth';
import { useHistory } from 'react-router-dom';
import { db, storage } from '../../firebase';
import { DatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import InternshipIntentionFileList, {
  SeguroPracticaFileList
} from './InternshipIntentionFileList';
import DateFnsUtils from '@date-io/date-fns';
import {
  changeDetailsApplication,
  reportNeedsChanges,
  sentApplication,
  pendingApplication,
  sentReport,
  sentExtension,
  deniedExtension,
  approvedExtension,
  finishedInternship
} from '../../InternshipStates';
import { AlarmAdd, ErrorOutline } from '@material-ui/icons';
import { DropzoneArea } from 'material-ui-dropzone';
import draftToHtml from 'draftjs-to-html';
import { convertFromRaw, convertToRaw, EditorState } from 'draft-js';
import firebase from 'firebase';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />;
});

const useStyles = makeStyles({
  icon: {
    fontSize: '2rem',
    marginRight: '1rem',
    '@media (max-width: 480px)': {
      fontSize: '1rem'
    }
  },
  button: {
    width: '8rem'
  }
});

function ToDoItem({
  icon,
  title,
  body,
  buttonText,
  buttonOnClick,
  disabled,
  reason,
  reasonExtension,
  internship,
  statusExtension,
  minorChanges
}) {
  const classes = useStyles();

  return (
    <Grid
      container
      style={{ padding: '1rem' }}
      justify='space-between'
      wrap='nowrap'>
      <Grid container>
        <Hidden smDown>
          <Grid item>{icon}</Grid>
        </Hidden>
        <Grid item>
          <Typography variant='h6'>{title}</Typography>
          <Hidden smDown>
            <Typography color='textSecondary' variant='body2'>
              {body}
            </Typography>
            {reasonExtension && statusExtension === deniedExtension && (
              <>
                <Typography color='error' variant='body2'>
                  Rechazado
                </Typography>
                <Typography variant='body2'>
                  Razón: {reasonExtension}
                </Typography>
              </>
            )}
            {statusExtension === approvedExtension && (
              <>
                <Typography style={{ color: '#4caf50' }} variant='body2'>
                  Aprobado
                </Typography>
                <Typography variant='body2'>
                  {`Observación: ${
                    reasonExtension ? reasonExtension : 'Sin observaciones'
                  }`}
                </Typography>
              </>
            )}
            {reason &&
              !(
                internship &&
                internship.status === sentApplication &&
                internship.status !== pendingApplication
              ) && (
                <Typography variant='body1' color='error'>
                  Razón de rechazo: {reason}
                </Typography>
              )}

            {minorChanges && (
              <Typography variant='body1'>
                Cambios necesarios: {minorChanges}
              </Typography>
            )}
          </Hidden>
        </Grid>
      </Grid>
      <Grid item>
        <Button
          className={classes.button}
          variant='outlined'
          color='primary'
          onClick={buttonOnClick}
          disabled={disabled}>
          {buttonText}
        </Button>
      </Grid>
    </Grid>
  );
}

function ToDoList({ done, reason }) {
  const [internship, setInternship] = useState();
  const { userData, user } = useAuth();
  const classes = useStyles();
  const [openDocs, setOpenDocs] = useState(false);
  const history = useHistory();
  const [openSecure, setOpenSecure] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [reasonExtension, setReasonExtension] = useState('');
  const [statusExtension, setStatusExtension] = useState('');
  const [survey, setSurvey] = useState([]);
  const [openSendReport, setOpenSendReport] = useState(false);
  const [openReportAnnotations, setOpenReportAnnotations] = useState(false);

  function handleFinish() {
    db.collection('internships').doc(userData.currentInternship.id).update({
      status: finishedInternship
    });
    db.collection('users').doc(user.uid).update({
      step: 0
    });
  }

  useEffect(() => {
    if (userData.currentInternship) {
      const unsubscribe = db
        .collection('internships')
        .doc(userData.currentInternship.id)
        .onSnapshot((doc) => {
          const data = doc.data();
          setInternship(data);
          setReasonExtension(data.reasonExtension);
          setStatusExtension(data.extensionStatus);
        });
      return unsubscribe;
    }
  }, []);

  useEffect(() => {
    db.collection('careers')
      .doc(userData.careerId)
      .onSnapshot((doc) => setSurvey(doc.data()));
  }, []);

  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<FaChevronDown />}
          aria-controls='panel1a-content'
          id='panel1a-header'>
          <Typography variant='h5'>Lista de Pendientes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {done ? (
            <Grid container direction='column' alignItems='center'>
              <img src='AllDone.png' alt='Vacio' />
              <Typography variant='h6'>
                No tienes tareas pendientes de momento.
              </Typography>
              <Typography color='textSecondary' variant='body2'>
                Ve, descansa. Si surje algo, te avisamos ;)
              </Typography>
            </Grid>
          ) : (
            <Grid direction='column' style={{ width: '100%' }}>
              <ToDoItem
                icon={<FiDownload className={classes.icon} />}
                title='Descargar Documentos'
                body='Descarga los documentos que tu carrera solicita adjuntar.'
                buttonText='Descargar'
                buttonOnClick={() => setOpenDocs(true)}
              />
              <Divider />
              {userData.step === 1 &&
                !(
                  internship && internship.status === changeDetailsApplication
                ) && (
                  <>
                    <ToDoItem
                      icon={<FaWpforms className={classes.icon} />}
                      title='Completar Formulario de Inscripción de Práctica'
                      body='Rellena este formulario con la información de la empresa en la que quieres realizar tu práctica.'
                      buttonText={
                        internship && internship.status === sentApplication
                          ? 'En revisión'
                          : 'Completar'
                      }
                      internship={internship}
                      buttonOnClick={() => history.push('/send-form')}
                      disabled={
                        internship && internship.status === sentApplication
                      }
                    />
                    <Divider />
                  </>
                )}
              {internship && internship.status === changeDetailsApplication && (
                <>
                  <ToDoItem
                    icon={<FaWpforms className={classes.icon} />}
                    title='Corregir Formulario'
                    buttonText='Corregir'
                    minorChanges={reason}
                    buttonOnClick={() =>
                      history.push(
                        `/edit-form/${userData.currentInternship.lastApplication}`
                      )
                    }
                  />
                  <Divider />
                </>
              )}
              {userData.step === 2 && (
                <>
                  <ToDoItem
                    icon={<FiDownload className={classes.icon} />}
                    title='Seguro de práctica'
                    body='Para comenzar tu práctica necesitas descargar el seguro.'
                    buttonText={
                      internship && !internship.seguroDisponible
                        ? 'En proceso'
                        : 'Descargar'
                    }
                    buttonOnClick={() => setOpenSecure(true)}
                    disabled={internship && !internship.seguroDisponible}
                  />
                  <Divider />
                </>
              )}
              {userData.step === 2 &&
                internship &&
                internship.status !== reportNeedsChanges && (
                  <>
                    <ToDoItem
                      icon={
                        <IoDocumentAttachOutline className={classes.icon} />
                      }
                      title='Enviar Informe'
                      body='Al finalizar tu periodo de práctica, cuéntanos lo que has aprendido.'
                      buttonText='Enviar'
                      buttonOnClick={
                        () => setOpenSendReport(true)
                        //history.push('/evaluation-report/')
                      }
                      disabled={internship && internship.status === sentReport}
                    />
                    <Divider />
                  </>
                )}
              {internship && internship.status === reportNeedsChanges && (
                <>
                  <ToDoItem
                    icon={<ErrorOutline className={classes.icon} />}
                    title='Observaciones'
                    body='Se te han indicado unas correcciones que puedes hacer a tu informe.'
                    buttonText='Ver observaciones'
                    buttonOnClick={() => setOpenReportAnnotations(true)}
                  />
                  <Divider />
                </>
              )}
              {internship && internship.status === reportNeedsChanges && (
                <>
                  <ToDoItem
                    icon={<IoDocumentAttachOutline className={classes.icon} />}
                    title='Resubir Informe'
                    body='El informe que has enviado requiere correcciones, vuelve a subirlo cuando lo hayas modificado.'
                    buttonText='Corregir'
                    buttonOnClick={() => setOpenSendReport(true)}
                  />
                  <Divider />
                </>
              )}
              {userData.step === 2 && (
                <>
                  <ToDoItem
                    icon={<AlarmAdd className={classes.icon} />}
                    title='Solicitar extensión'
                    body='Se enviará una solicitud para extender la fecha de término de su práctica'
                    buttonText='Solicitar'
                    reasonExtension={reasonExtension}
                    statusExtension={statusExtension}
                    disabled={
                      internship && internship.extensionStatus === sentExtension
                    }
                    buttonOnClick={() => setShowExtension(true)}
                  />
                  <Divider />
                </>
              )}
              {/*userData.step === 3 && (
                <ToDoItem
                  icon={<RiSurveyLine className={classes.icon} />}
                  title='Responder Encuesta'
                  body='Cuéntanos tu experiencia durante las semanas de práctica.'
                  buttonText='Responder'
                  buttonOnClick={(e) => {
                    e.preventDefault();
                    window.location.href = survey.satisfactionSurvey;
                  }}
                />
                )*/}
              {/*userData.step === 4 && (
                <ToDoItem
                  icon={<RiSurveyLine className={classes.icon} />}
                  title='Terminar proceso'
                  body='Termina el proceso para ver tu nota'
                  buttonText='Terminar'
                  buttonOnClick={() => {
                    Swal.fire({
                      title: '¿Desea terminar su proceso de práctica?',
                      showDenyButton: true,
                      confirmButtonText: `Terminar`,
                      denyButtonText: `Salir`
                    }).then((result) => {
                      if (result.isConfirmed) {
                        Swal.fire('¡Proceso terminado!', '', 'success').then(
                          (result) => {
                            if (result.isConfirmed) handleFinish();
                          }
                        );
                      } else if (result.isDenied) {
                        Swal.fire('¿No quieres ver tu nota?', '', 'info');
                      }
                    });
                  }}
                />
                )*/}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>
      <SendReportDialog open={openSendReport} setOpen={setOpenSendReport} />
      <DocsDialog open={openDocs} setOpen={setOpenDocs} />
      <DocsDialogSeguro open={openSecure} setOpen={setOpenSecure} />
      <DialogExtension
        internship={internship}
        open={showExtension}
        setOpen={setShowExtension}
      />
      <ReportAnnotationsDialog
        open={openReportAnnotations}
        setOpen={setOpenReportAnnotations}
        internship={internship}
      />
    </MuiPickersUtilsProvider>
  );
}

function DialogExtension({ internship, open, setOpen }) {
  const [dateExtension, setDateExtension] = useState(new Date());
  const [reasonRequestExtension, setReasonRequestExtension] = useState('');
  const { userData } = useAuth();

  function handleSendExtension() {
    db.collection('internships').doc(userData.currentInternship.id).update({
      extensionStatus: sentExtension,
      dateExtension: dateExtension,
      reasonExtension: reasonRequestExtension
    });
  }

  function transformDate(date) {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ];

    return (
      date.getDate() + '/' + months[date.getMonth()] + '/' + date.getFullYear()
    );
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      TransitionComponent={Transition}
      maxWidth='sm'
      fullWidth={true}>
      <DialogTitle>Solicitud de extensión</DialogTitle>
      <DialogContent>
        <Grid container direction='column' spacing={2}>
          <Grid item>
            <TextField
              multiline
              rows={4}
              fullWidth
              variant='outlined'
              label='Razón de la solicitud'
              value={reasonRequestExtension}
              onChange={(e) => setReasonRequestExtension(e.target.value)}
            />
          </Grid>
          <Grid item>
            <DatePicker
              fullWidth
              disabled
              disableToolbar
              variant='inline'
              format='dd/MM/yyyy'
              label='Fecha de término actual'
              value={
                internship &&
                internship.applicationData &&
                internship.applicationData['Fecha de término']
                  ? transformDate(
                      internship.applicationData['Fecha de término'].toDate()
                    )
                  : null
              }
              onChange={(date) => setDateExtension(date)}
            />
          </Grid>
          <Grid item>
            <DatePicker
              fullWidth
              disableToolbar
              variant='inline'
              format='dd/MM/yyyy'
              label='Nueva fecha de término'
              value={
                dateExtension === ''
                  ? new Date()
                  : dateExtension instanceof Date
                  ? dateExtension
                  : dateExtension.toDate()
              }
              onChange={(date) => setDateExtension(date)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          color='primary'
          onClick={() => setOpen(false)}>
          Cerrar
        </Button>
        <Button
          variant='contained'
          color='primary'
          onClick={() => {
            handleSendExtension();
            setOpen(false);
          }}>
          Solicitar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SendReportDialog({ open, setOpen }) {
  const [files, setFiles] = useState([]);
  const { user, userData } = useAuth();

  function handleSend() {
    files.forEach((file) => {
      storage
        .ref()
        .child(
          `/students-docs/${user.uid}/${userData.currentInternship.id}/reports/${userData.currentInternship.id}.pdf`
        )
        .put(file);
    });
    db.collection('internships').doc(userData.currentInternship.id).update({
      status: sentReport,
      creationDate: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  return (
    <Dialog fullWidth onClose={() => setOpen(false)} open={open}>
      <DialogTitle>Enviar informe de práctica</DialogTitle>
      <DialogContent>
        <Grid item xs={12}>
          <DropzoneArea
            showFileNames
            filesLimit={1}
            acceptedFiles={['application/pdf']}
            onChange={(file) => setFiles(file)}
          />
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button color='primary' onClick={() => setOpen(false)}>
          cancelar
        </Button>
        <Button
          variant='contained'
          disabled={files.length === 0 ? true : false}
          color='primary'
          onClick={() => {
            handleSend();
            setOpen(false);
          }}>
          enviar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReportAnnotationsDialog({ open, setOpen, internship }) {
  return (
    <Dialog fullWidth open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Observaciones de tu informe</DialogTitle>
      <DialogContent>
        {internship && internship.reportAnnotations && (
          <div
            dangerouslySetInnerHTML={{
              __html: draftToHtml(
                convertToRaw(
                  EditorState.createWithContent(
                    convertFromRaw(internship.reportAnnotations)
                  ).getCurrentContent()
                )
              )
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant='contained'
          color='primary'
          onClick={() => setOpen(false)}>
          Aceptar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DocsDialogSeguro({ open, setOpen }) {
  const { user, userData } = useAuth();

  function handleCloseDocsDialog() {
    setOpen(false);
  }

  return (
    <Dialog fullWidth onClose={handleCloseDocsDialog} open={open}>
      <DialogTitle>Seguro para práctica</DialogTitle>
      <DialogContent>
        {userData.currentInternship && (
          <SeguroPracticaFileList
            studentId={user.uid}
            internshipId={userData.currentInternship.id}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDocsDialog} color='primary'>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DocsDialog({ open, setOpen }) {
  const { user, userData } = useAuth();

  function handleCloseDocsDialog() {
    setOpen(false);
  }

  return (
    <Dialog fullWidth onClose={handleCloseDocsDialog} open={open}>
      <DialogTitle>Descargar documentos</DialogTitle>
      <DialogContent>
        {userData.currentInternship && (
          <InternshipIntentionFileList
            studentId={user.uid}
            internshipId={userData.currentInternship.id}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDocsDialog} color='primary'>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ToDoList;
