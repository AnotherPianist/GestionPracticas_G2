import React, { useEffect, useState } from 'react';
import useAuth from '../../providers/Auth';
import { db, storage } from '../../firebase';
import { Route, Switch } from 'react-router-dom';
import EmptyHome from './EmptyHome';
import DetailedHome from './DetailedHome';
import { Container, Grid, Hidden, Typography } from '@material-ui/core';

function DashboardEstudiante(props) {
  const { user, userData } = useAuth();
  const [careerInternshipInfo, setCareerInternshipInfo] = useState();
  const [docs, setDocs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [practicas, setPracticas] = useState([]);

  useEffect(() => {
    if (userData) {
      db.collection('careerInternshipInfo')
        .where('careerId', '==', userData.careerId)
        .get()
        .then((querySnapshot) =>
          setCareerInternshipInfo(querySnapshot.docs[0].data())
        );

      storage
        .ref(`careers-docs/${userData.careerId}`)
        .listAll()
        .then((res) => setDocs(res.items));

      db.collection('internships')
        .where('studentId', '==', user.uid)
        .get()
        .then((querySnapshot) => {
          const temp = [];
          querySnapshot.forEach((doc) =>
            temp.push({ id: doc.id, ...doc.data() })
          );
          setPracticas(temp);
          setLoaded(true);
        });
    }
  }, [user, userData]);

  return (
    <Switch>
      <Route exact path='/'>
        <Hidden smDown>
          <Grid
            style={{
              backgroundImage: "url('HomeBanner-2x.png')",
              backgroundSize: 'cover'
            }}>
            <Typography variant='h4' style={{ padding: '2rem' }}>
              ¡Bienvenido, {userData && userData.name}!
            </Typography>
          </Grid>
        </Hidden>
        {props.onGoingIntern ? (
          <DetailedHome done={true} />
        ) : (
          <EmptyHome practicas={practicas} />
        )}
      </Route>
      {/*<Route path='/form/:userId/:internshipId'>
        <Formulario />
      </Route>
      <Route path='/internship/:studentId/:internshipId'>
      <StudentApplications />
      </Route>
      <Route path='/applications/:applicationId'>
      <ApplicationDetails />
    </Route>*/}
    </Switch>
  );
}

export default DashboardEstudiante;
