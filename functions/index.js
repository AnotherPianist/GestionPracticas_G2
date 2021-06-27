const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.importStudents = functions.https.onCall((data, context) => {
  admin
    .firestore()
    .collection('userCreationRequests')
    .add({
      userDetails: data,
      role: 'student',
      status: 'Pending',
      createdBy: context.auth.uid,
      createdOn: admin.firestore.FieldValue.serverTimestamp()
    })
    .then((userCreationRequestRef) => {
      admin
        .auth()
        .createUser({
          email: data.email,
          password: data.password,
          displayName: data.name
        })
        .then((userRecord) => {
          const dataWithoutPassword = Object.assign({}, data);
          delete dataWithoutPassword.password;
          admin.auth().setCustomUserClaims(userRecord.uid, {
            student: true,
            careerId: data.careerId
          });
          admin
            .firestore()
            .collection('users')
            .doc(userRecord.uid)
            .set(dataWithoutPassword);
          admin
            .firestore()
            .collection('careers')
            .doc(dataWithoutPassword.careerId.toString())
            .get()
            .then((careerDoc) => {
              const internships = careerDoc.data().internships;
              for (let i = 0; i < internships; i++)
                admin
                  .firestore()
                  .collection('internships')
                  .add({
                    applicationNumber: i + 1,
                    careerId: dataWithoutPassword.careerId,
                    status: 'Práctica disponible',
                    studentId: userRecord.uid,
                    studentName: data.name
                  });
              userCreationRequestRef.update({ status: 'Treated' });
              functions.logger.info(
                `Student ${userRecord.uid} created successfully.`
              );
            });
        });
    });
});

exports.createSupervisor = functions.https.onCall((data, context) => {
  admin
    .firestore()
    .collection('userCreationRequests')
    .add({
      userDetails: data,
      role: 'supervisor',
      status: 'Pending',
      createdBy: context.auth.uid,
      createdOn: admin.firestore.FieldValue.serverTimestamp()
    })
    .then((userCreationRequestRef) => {
      admin
        .auth()
        .createUser({
          email: data.email,
          password: data.password,
          displayName: data.name
        })
        .then((userRecord) => {
          admin.auth().setCustomUserClaims(userRecord.uid, {
            supervisor: true,
            careerId: data.careerId
          });
          userCreationRequestRef.update({ status: 'Treated' });
          functions.logger.info(
            `Supervisor ${userRecord.uid} created successfully.`
          );
        });
    });
});

exports.listSupervisors = functions.https.onCall((data, context) => {
  return admin
    .auth()
    .listUsers()
    .then((listUsersResult) => {
      const supervisors = [];
      listUsersResult.users.forEach((userRecord) => {
        if (userRecord.customClaims.supervisor) supervisors.push(userRecord);
      });
      return supervisors;
    });
});

exports.editSupervisor = functions.https.onCall((data, context) => {
  admin
    .auth()
    .updateUser(data.uid, {
      displayName: data.displayName
    })
    .then(() =>
      admin.auth().setCustomUserClaims(data.uid, {
        supervisor: true,
        careerId: data.careerId
      })
    )
    .then(() => console.log(`Updated supervisor ${data.uid}`))
    .catch((error) =>
      console.log('An error occured while editing supervisor: ', error)
    );
});

exports.deleteSupervisor = functions.https.onCall((data, context) => {
  admin
    .auth()
    .deleteUser(data.uid)
    .then(() => console.log(`Deleted supervisor ${data.uid}`))
    .catch((error) =>
      console.log('An error occured while deleting supervisor: ', error)
    );
});
