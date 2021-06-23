import React, { useEffect, useState } from 'react';
import {
  Grid,
  Container,
  Typography,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  TextField,
  List,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Buttonm,
  Slide,
  Button
} from '@material-ui/core';
import { CameraSharp, NavigateNext } from '@material-ui/icons';
import { useHistory } from 'react-router-dom';
import { db } from '../../firebase';
import {
  approvedExtension,
  deniedExtension,
  sentExtension,
  sentReport
} from '../../InternshipStates';

import CareerSelector from '../../utils/CareerSelector';
import { set } from 'date-fns';
import useAuth from '../../providers/Auth';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />;
});

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

function ListExtension({ edit }) {
  let users = [];

  const [name, setName] = useState('');
  const [careerId, setCareerId] = useState('general');
  const [internships, setInternships] = useState([]);

  const [filterInterships, setFilterInternships] = useState([]);

  function applyFilter(list) {
    let filtered = [...list];

    if (careerId !== 'general')
      filtered = filtered.filter((item) => item.careerId === careerId);
    if (name !== '')
      filtered = filtered.filter((item) => item.name.includes(name));
    return filtered;
  }

  function getInfoStudent(list, id) {
    for (let index = 0; index < list.length; index++) {
      const element = list[index];
      if (element.id === id) {
        return { name: element.name, careerId: element.careerId };
      }
    }
  }

  useEffect(() => {
    db.collection('users')
      .get()
      .then((student) =>
        student.forEach((element) => {
          const studentData = element.data();
          users.push({
            id: element.id,
            name: studentData.name,
            careerId: studentData.careerId
          });
        })
      );

    const unsubscribe = db
      .collection('internships')
      .onSnapshot((querySnapshot) => {
        let list = [];
        let info;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.exceptionStatus === sentExtension) {
            list.push({
              id: doc.id,
              name: getInfoStudent(users, data.studentId).name,
              careerId: getInfoStudent(users, data.studentId).careerId,
              ...data
            });
          }
        });

        setInternships(list);
        if (list) setFilterInternships(applyFilter(list));
      });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (internships) setFilterInternships(applyFilter(internships));
  }, [careerId, name]);

  return (
    <Grid container direction='column'>
      <div
        style={{
          backgroundImage: "url('AdminBanner-Extension.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: '2rem'
        }}>
        <Typography variant='h4'>Extensiones de prácticas</Typography>
      </div>
      <Container style={{ marginTop: '2rem' }}>
        <Grid container justify='flex-end' alignItems='center' spacing={4}>
          <Grid item>
            <TextField
              label='Buscar estudiante'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
          <Grid item>
            <CareerSelector careerId={careerId} setCareerId={setCareerId} />
          </Grid>
        </Grid>
      </Container>
      <Container style={{ marginTop: '2rem' }}>
        <List>
          {filterInterships.map((intership) => (
            <>
              <IntershipItem intership={intership} users={users} />
              <Divider />
            </>
          ))}
        </List>
      </Container>
    </Grid>
  );
}

function IntershipItem({ intership, users }) {
  const [showApproved, setShowApproved] = useState(false);
  const [showDeined, setShowDeined] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [application, setApplication] = useState();
  const [internshipsExtension, setInternshipsExtension] = useState();
  const [idApplication, setIdApplication] = useState();
  const [reason, setReason] = useState('');
  const { userData } = useAuth();
  function TransformDate(date) {
    return (
      date.getDate() + '/' + months[date.getMonth()] + '/' + date.getFullYear()
    );
  }
  function handleExtensionDeined() {
    db.collection('internships')
      .doc(internshipsExtension.id)
      .update({
        exceptionStatus: deniedExtension,
        dateExtension: '',
        reasonExtension: reason ? reason : ''

        //cambiar statusExeption
      });
    db.collection('mails').add({
      to: application.email,
      template: {
        name: 'ExtensionFailed',
        data: {
          from_name: application['Nombre del estudiante'],
          result: reason,
          rechazado_por: userData.name
        }
      }
    });
  }
  function handleExtensionApproved() {
    application['Fecha de término'] = internshipsExtension.dateExtension;
    application['form'].forEach((step) => {
      step['form'].forEach((camp) => {
        if (
          camp['type'] === 'Campos predefinidos' &&
          camp['name'] === 'Fecha de término'
        ) {
          //cambiar el valor en el formulario
          camp['value'] = internshipsExtension.dateExtension;
        }
      });
    });
    //actualizar en la base de datos
    db.collection('applications')
      .doc(idApplication)
      .update({
        ...application
      });

    db.collection('internships').doc(internshipsExtension.id).update({
      exceptionStatus: approvedExtension,
      dateExtension: '',
      reasonExtension: reason

      //cambiar statusExeption
    });
    db.collection('mails').add({
      to: application.email,
      template: {
        name: 'ExtensionApproved ',
        data: {
          from_name: application['Nombre del estudiante'],
          aprobado_por: userData.name,
          razon_aprobacion: reason ? reason : 'Sin observaciones'
        }
      }
    });
  }

  useEffect(() => {
    db.collection('users')
      .doc(intership.studentId)
      .get()
      .then((user) => {
        setIdApplication(user.data().currentInternship.lastApplication);
      });
  }, []);

  useEffect(() => {
    if (idApplication) {
      db.collection('applications')
        .doc(idApplication)
        .get()
        .then((appl) => setApplication(appl.data()));
    }
  }, [idApplication]);

  return (
    <>
      <ListItem
        button
        onClick={() => {
          setShowExtension(true);
        }}>
        <ListItemText primary={intership.name} />
        <ListItemSecondaryAction>
          <IconButton
            onClick={() => {
              setInternshipsExtension(intership);
              setShowExtension(true);
            }}>
            <NavigateNext />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
      {internshipsExtension && (
        <Dialog
          open={showExtension}
          onClose={() => setShowExtension(false)}
          TransitionComponent={Transition}
          maxWidth='sm'
          fullWidth={true}>
          <DialogTitle>Solicitud de extensión</DialogTitle>

          <DialogContent>
            <Grid container direction='column' spacing={2}>
              <Grid item>
                <TextField
                  multiline
                  rowsMax={4}
                  fullWidth
                  variant='outlined'
                  label={'Razon de la solicitud'}
                  value={internshipsExtension.reasonExtension}
                />
              </Grid>
              <Grid item>
                <TextField
                  multiline
                  rowsMax={4}
                  fullWidth
                  variant='outlined'
                  label={'Fecha propuesta'}
                  value={
                    internshipsExtension.dateExtension
                      ? TransformDate(
                          internshipsExtension.dateExtension.toDate()
                        )
                      : null
                  }
                />
              </Grid>
              <Grid item>
                <TextField
                  multiline
                  rowsMax={4}
                  fullWidth
                  variant='outlined'
                  label={'Fecha actual'}
                  value={
                    application['Fecha de término']
                      ? TransformDate(application['Fecha de término'].toDate())
                      : null
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              color='secondary'
              onClick={() => setShowDeined(true)}>
              Rechazar
            </Button>
            <Button
              variant='contained'
              color='primary'
              onClick={() => {
                setShowApproved(true);
              }}>
              Aceptar
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Dialog
        open={showApproved || showDeined}
        onClose={() => {
          setShowApproved(false);
          setShowDeined(false);
        }}
        TransitionComponent={Transition}
        maxWidth='sm'
        fullWidth={true}>
        <DialogTitle>
          {showApproved ? 'Aprobar' : 'Rechazar'} solicitud de Extencion
          extensión
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rowsMax={4}
            fullWidth
            variant='outlined'
            label={'Observaciones'}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowApproved(false);
              setShowApproved(false);
            }}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color={showApproved ? 'primary' : 'secondary'}
            onClick={() => {
              if (showApproved) {
                handleExtensionApproved();
              } else {
                handleExtensionDeined();
              }
              setShowApproved(false);
              setShowDeined(false);
              setShowExtension(false);
            }}>
            {showApproved ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
export default ListExtension;