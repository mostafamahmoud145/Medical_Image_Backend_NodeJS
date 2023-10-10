const { spawn } = require('child_process');
const express = require('express')
const multer = require('multer');
const fs = require('fs');
const app = express()
const { PythonShell } = require('python-shell');
const stream = require('stream');
const { Readable } = require('stream');
require('./src/db/mongoose')
const Images = require('./src/model/images');
const User = require('./src/model/users');
const Patient = require('./src/model/patients');
const { log } = require('console');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const request = require('postman-request')
const jwt = require('jsonwebtoken');
const ObjectID = require('mongodb').ObjectID;
const path = require('path');
const { isUndefined } = require('util');

const port = 8080

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.json());


app.use(express.static(__dirname))
const loc = "http://localhost:8080/uploads/"


const dbName = 'taks-manager-api'
const url = 'mongodb://127.0.0.1:27017';


process.env.PYTHON = "C:\Users\oem\AppData\Local\Programs\Python\Python311\python.exe";
process.stdout.write('Starting Python script...\n');


const classify = spawn('python', ["Classification_General\\General_API.py", '8001']);

classify.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

classify.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

classify.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});
const classifyMRI = spawn('python', ["Classification_MRI\\MRI_API.py"]);

classifyMRI.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

classifyMRI.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

classifyMRI.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});
const kneeMRI = spawn('python', ["Classification_MRI_Knee\\MRI_Knee_API.py"]);

kneeMRI.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

kneeMRI.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

kneeMRI.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});
const classifyMriHead = spawn('python', ["Segmentation_MRI\\MRI_Seg_API.py", '8005']);

classifyMriHead.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

classifyMriHead.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

classifyMriHead.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});

const od = spawn('python', ["Object_Detection\\OD_API.py", '8004']);

od.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

od.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

od.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});

const xr = spawn('python', ["Classification_XR\\XR_API.py", '8003']);

xr.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

xr.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

xr.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/'); // specify the directory to save the file
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg'); // use custom filename based on the current date and time
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // limit the file size to 10MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      console.log(file.mimetype);
    } else {
      console.log(file.mimetype);
      //cb(new Error('Only images are allowed'));
    }
  }
}).array('image', 1000);


const specificUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // limit the file size to 10MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      console.log(file.mimetype);
    } else {
      console.log(file.mimetype);
      //cb(new Error('Only images are allowed'));
    }
  }
}).single('image');




app.post('/uploadPatientImage', specificUpload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const doctorUsername = req.body.doctor_username;
  if (doctorUsername === "" || !('doctor_username' in req.body)) {
    console.log("Please enter doctor's username");
    res.send({ "status": "false", "message": "Please enter doctor's username", "data": null });
  }
  else if (!('file' in req) || req.file === null) {
    console.log("Please enter image");
    res.send({ "status": "false", "message": 'Please enter image', "data": null });
  }
  else {
    User.findOne({ tokens: authHeader }).then((result) => {
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else {
        User.findOne({ username: doctorUsername }).then((result1) => {
          if (!result1) {
            console.log("Doctor's username is wrong");
            res.send({ "status": "false", "message": "Doctor's username is wrong", "data": null });
          }
          else {
            const currentDate = new Date();
            const file = req.file;
            const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "patientID": result['_id'].toString(), "doctorID": [result1['_id'].toString()], "flagged": false, "classified": false, "approved": false, "date": currentDate });
            image.save().then((data) => {
              console.log(image);
              res.send({ "status": "true", "message": 'Image uploaded successfully', "data": { "image": image['path'], "id": image['_id'].toString() } });
            }).catch((e) => {
              console.log("failed:", e);
              res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
            })
          }
        }).catch((e) => {
          console.log("failed:", e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        })

      }
    }).catch((e) => {
      console.log("failed:", e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }


  // Send the POST request after a delay of 100 milliseconds
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 100);
  });

});

app.get('/patientpending', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (!result) {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      Images.find({ "patientID": result['_id'].toString(), "classified": false, "approved": false }).then((result1) => {
        const promises = result1.map(async (item) => {
          const { _id, path, date } = item;
          const newItem = { "id": _id.toString(), "image": path, date };
          image.push(newItem);
          console.log(image);
        })

        Promise.all(promises)
          .then(() => {
            res.send({ "status": "true", "message": 'Get Pending Images Successfully', "data": image })
          })
          .catch((err) => {
            console.error(err)
            res.send({ "status": "false", "message": err, "data": null })
          })
      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
})

app.get('/patientclassified', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (!result) {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      Images.find({ "patientID": result['_id'].toString(), "classified": true, "approved": true }).then((result1) => {
        const promises = result1.map((item) => {
          const { _id, path, object_detection, segmentation, diagnose, date } = item
          const newItem = { "id": _id.toString(), "image": path, "image_object_detection": object_detection['image_object_detection'], "segmented_image": segmentation['segmented_image'], "contour_image": segmentation['contour_image'], diagnose, date }
          image.push(newItem)
          console.log(image);
        })

        Promise.all(promises)
          .then(() => {
            res.send({ "status": "true", "message": 'Get Classified Images Successfully', "data": image })
          })
          .catch((err) => {
            console.error(err)
            res.send({ "status": "false", "message": err, "data": null })
          })
      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
})

app.post('/approve', (req, res) => {
  let list = []
  let promises = []
  let successCount = 0
  const authHeader = req.headers['authorization'];
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (!result) {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else {
        for (let item of req.body) {
          const imageID = item.imageID
          if (imageID === "" || !('imageID' in item) || imageID === null) {
            list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
          }
          else if (item.imageID.length !== 24) {
            list.push({ "imageID": imageID, "status": 'false', "message": "Image id is wrong" })
          }
          else {
            let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
              if (result) {
                return Images.updateOne({ "_id": new mongoose.Types.ObjectId(imageID) }, { "approved": true }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": imageID, "status": 'true', "message": "Approved Successfully" })
                    successCount++
                  }
                  else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Unable to approve item" })
                  }
                }).catch((e) => {
                  console.log(e);
                  list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                })
              }
              else {
                list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
              }
            })
            promises.push(promise)
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Approved Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Approved Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were approved successfully, but others failed', "data": list });
          }
        }).catch((e) => {
          console.log(e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
    }))
  }
})

app.post('/accept', (req, res) => {
  const authHeader = req.headers['authorization'];
  let promises = [];
  let list = []
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (!result) {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else {
        for (let item of req.body) {
          const imageID = item.imageID
          if (imageID === "" || !('imageID' in item) || imageID === null) {
            list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
          }
          else if (item.imageID.length !== 24) {
            list.push({ "imageID": imageID, "status": 'false', "message": "Image id is wrong" })
          }
          else {
            let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
              if (result) {
                return Images.updateOne({ "_id": new mongoose.Types.ObjectId(imageID) }, { "flagged": false }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": imageID, "status": 'true', "message": "Done Successfully" });
                    successCount++
                  }
                  else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Unable to edit item" })
                  }
                }).catch((e) => {
                  console.log(e);
                  list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                })
              }
              else {
                list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
              }
            })
            promises.push(promise)
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were done successfully, but others failed', "data": list });
          }
        }).catch((e) => {
          console.log(e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
    }))
  }
})

app.post('/share', (req, res) => {
  const authHeader = req.headers['authorization'];
  let promises = [];
  let list = []
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID and doctorID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (!result) {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else if (!('doctor_username' in req.body) || req.body.doctor_username === null) {
        res.send({ "status": "false", "message": "Doctor's username cannot be equal null", "data": null });
      }
      else {
        const doctorUsername = req.body.doctor_username
        User.findOne({ 'username': doctorUsername }).then((resul) => {
          if ((resul && resul['userType'] === 'doctor')) {
            for (let item of req.body.images) {
              const imageID = item.imageID
              if (imageID === "" || !('imageID' in item) || imageID === null) {
                list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
              }
              else if (item.imageID.length !== 24) {
                list.push({ "imageID": imageID, "status": 'false', "message": "Image id is wrong" })
              }
              else {
                let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
                  if (result) {
                    if (!(result['doctorID'].includes(resul['_id'].toString()))) {
                      let doctors = result["doctorID"]
                      doctors.push(resul['_id'].toString());
                      return Images.updateOne({ "_id": new mongoose.Types.ObjectId(imageID) }, { "doctorID": doctors }).then((result) => {
                        if (result['acknowledged'] === true) {
                          list.push({ "imageID": imageID, "status": 'true', "message": "Done Successfully" });
                          successCount++
                        }
                        else {
                          list.push({ "imageID": imageID, "status": 'false', "message": "Unable to edit item" })
                        }
                      }).catch((e) => {
                        console.log(e);
                        list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                      })
                    }
                    else {
                      list.push({ "imageID": imageID, "status": 'false', "message": "This photo has already been shared with this username" })
                    }
                  }
                  else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
                  }
                })
                promises.push(promise)
              }
            }
            Promise.all(promises).then(() => {
              if (successCount === req.body.images.length) {
                res.send({ "status": "true", "message": 'Done Successfully', "data": list });
              } else if (successCount === 0) {
                res.send({ "status": "false", "message": 'Failed', "data": list });
              } else {
                res.send({ "status": "true", "message": 'Some items were shared successfully, but others failed', "data": list });
              }
            }).catch((e) => {
              console.log(e);
              res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
            });
          }
          else {
            res.send({ "status": "false", "message": "Doctor's username is wrong", "data": null });
          }
        })

      }
    }))
  }
})

app.put('/editClassified', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else {
        for (let item of req.body) {
          const { imageID, classification, segmentation, diagnose, object_detection } = item;
          if (imageID === "" || !('imageID' in item) || imageID === null) {
            console.log("Please enter image ID");
            list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
          }
          else if (typeof imageID !== 'number' && (imageID.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(imageID))) && (imageID.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(imageID)))) {
            list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
          }
          else {
            let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
              if (result) {
                return Images.updateOne({ "_id": new mongoose.Types.ObjectId(imageID) }, { classification, segmentation, diagnose, object_detection }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": imageID, "status": 'true', "message": "Edited Successfully" });
                    successCount++
                  } else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Unable to edit item" })
                  }
                }).catch((error) => {
                  console.log(error);
                  list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                });
              }
              else {
                list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
              }
            })
            promises.push(promise);
          }
        }

        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were edited successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})

app.put('/editFlagged', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else {
        for (let item of req.body) {
          const { imageID, classification, segmentation, object_detection } = item;
          if (imageID === "" || !('imageID' in item) || imageID === null) {
            console.log("Please enter image ID");
            list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
          }
          else if (typeof imageID !== 'number' && (imageID.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(imageID))) && (imageID.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(imageID)))) {
            list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
          }
          else {
            let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
              if (result) {
                return Images.updateOne({ "_id": new mongoose.Types.ObjectId(imageID) }, { classification, segmentation, object_detection }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": imageID, "status": 'true', "message": "Edited Successfully" });
                    successCount++
                  } else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Unable to edit item" })
                  }
                }).catch((error) => {
                  console.log(error);
                  list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                });
              }
              else {
                list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
              }
            })
            promises.push(promise);
          }
        }

        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were edited successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})

app.get('/doctorClassified', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (!result) {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      Images.find({ "doctorID": result['_id'].toString(), "classified": true, "flagged": false }).then((result1) => {
        const promises = result1.map((item) => {
          console.log(item);
          if (item['patientID'] === null) {
            const { _id, path, classification, object_detection, segmentation, approved, date, diagnose, } = item
            const newItem = { "id": _id.toString(), "image": path, "patientUsername": null, "patientGender": null, "patientAge": null, "patientPhone": null, "patientEmail": null, classification, object_detection, segmentation, approved, date, diagnose }
            image.push(newItem)
          }

          return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
            if (!result) {
              return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (result) {
                  const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                  image.push(newItem)
                }
              })
            } else {
              const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
              const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
              image.push(newItem)
            }
          })
        })

        Promise.all(promises)
          .then(() => {
            res.send({ "status": "true", "message": 'Get Classified Images Successfully', "data": image })
          })
          .catch((err) => {
            console.error(err)
            res.send({ "status": "false", "message": err, "data": null })
          })


      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
});

app.get('/doctorClassifiedSearch', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  const search = req.body.search
  User.findOne({ tokens: authHeader }).then((result2 => {
    if (!result2) {
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else if (!('search' in req.body) || req.body.search === null) {
      res.send({ "status": "false", "message": "Please send search key", "data": null });
    }
    else {
      User.findOne({ "username": search }).then((result) => {
        if (result) {
          Images.find({
            "doctorID": result2['_id'].toString(), "classified": true, "flagged": false, $or: [
              {
                "classification": { $elemMatch: { 'classification': search.toUpperCase() } }
              },
              {
                "patientID": result['_id'].toString()
              }
            ]
          }).then((result1) => {
            console.log(result1);
            const promises = result1.map((item) => {
              if (item['patientID'] === null) {
                const { _id, path, classification, object_detection, segmentation, approved, date, diagnose, } = item
                const newItem = { "id": _id.toString(), "image": path, "patientUsername": null, "patientGender": null, "patientAge": null, "patientPhone": null, "patientEmail": null, classification, object_detection, segmentation, approved, date, diagnose }
                image.push(newItem)
              }

              return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (!result) {
                  return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                    if (result) {
                      const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                      const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                      image.push(newItem)
                    }
                  })
                } else {
                  const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                  image.push(newItem)
                }
              })
            })

            Promise.all(promises)
              .then(() => {
                res.send({ "status": "true", "message": 'Get Classified Images Successfully', "data": image })
              })
              .catch((err) => {
                console.error(err)
                res.send({ "status": "false", "message": err, "data": null })
              })
          })
        }
        else {
          Images.find({ "doctorID": result2['_id'].toString(), "classified": true, "flagged": false, "classification": { $elemMatch: { 'classification': search.toUpperCase() } } }).then((result1) => {
            const promises = result1.map((item) => {
              console.log(item);
              if (item['patientID'] === null) {
                const { _id, path, classification, object_detection, segmentation, approved, date, diagnose, } = item
                const newItem = { "id": _id.toString(), "image": path, "patientUsername": null, "patientGender": null, "patientAge": null, "patientPhone": null, "patientEmail": null, classification, object_detection, segmentation, approved, date, diagnose }
                image.push(newItem)
              }

              return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (!result) {
                  return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                    if (result) {
                      const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                      const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                      image.push(newItem)
                    }
                  })
                } else {
                  const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                  image.push(newItem)
                }
              })
            })

            Promise.all(promises)
              .then(() => {
                res.send({ "status": "true", "message": 'Get Classified Images Successfully', "data": image })
              })
              .catch((err) => {
                console.error(err)
                res.send({ "status": "false", "message": err, "data": null })
              })
          })
        }
      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
});

app.get('/doctorFlaggedSearch', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  const search = req.body.search
  User.findOne({ tokens: authHeader }).then((result2 => {
    if (!result2) {
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else if (!('search' in req.body) || req.body.search === null) {
      res.send({ "status": "false", "message": "Please send search key", "data": null });
    }
    else {
      User.findOne({ "username": search }).then((result) => {
        if (result) {
          Images.find({
            "doctorID": result2['_id'].toString(), "classified": true, "flagged": true, $or: [
              {
                "classification": { $elemMatch: { 'classification': search.toUpperCase() } }
              },
              {
                "patientID": result['_id'].toString()
              }
            ]
          }).then((result1) => {
            console.log(result1);
            const promises = result1.map((item) => {
              if (item['patientID'] === null) {
                const { _id, path, classification, object_detection, segmentation, approved, date, diagnose, } = item
                const newItem = { "id": _id.toString(), "image": path, "patientUsername": null, "patientGender": null, "patientAge": null, "patientPhone": null, "patientEmail": null, classification, object_detection, segmentation, approved, date, diagnose }
                image.push(newItem)
              }

              return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (!result) {
                  return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                    if (result) {
                      const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                      const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                      image.push(newItem)
                    }
                  })
                } else {
                  const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                  image.push(newItem)
                }
              })
            })

            Promise.all(promises)
              .then(() => {
                res.send({ "status": "true", "message": 'Get Flagged Images Successfully', "data": image })
              })
              .catch((err) => {
                console.error(err)
                res.send({ "status": "false", "message": err, "data": null })
              })
          })
        }
        else {
          Images.find({ "doctorID": result2['_id'].toString(), "classified": true, "flagged": true, "classification": { $elemMatch: { 'classification': search.toUpperCase() } } }).then((result1) => {
            const promises = result1.map((item) => {
              console.log(item);
              if (item['patientID'] === null) {
                const { _id, path, classification, object_detection, segmentation, approved, date, diagnose, } = item
                const newItem = { "id": _id.toString(), "image": path, "patientUsername": null, "patientGender": null, "patientAge": null, "patientPhone": null, "patientEmail": null, classification, object_detection, segmentation, approved, date, diagnose }
                image.push(newItem)
              }

              return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (!result) {
                  return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                    if (result) {
                      const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                      const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                      image.push(newItem)
                    }
                  })
                } else {
                  const { _id, path, classification, object_detection, segmentation, approved, date, diagnose } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, approved, date, diagnose }
                  image.push(newItem)
                }
              })
            })

            Promise.all(promises)
              .then(() => {
                res.send({ "status": "true", "message": 'Get Flagged Images Successfully', "data": image })
              })
              .catch((err) => {
                console.error(err)
                res.send({ "status": "false", "message": err, "data": null })
              })
          })
        }
      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
});

app.get('/doctorFlagged', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (!result) {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      Images.find({ "doctorID": result['_id'].toString(), "classified": true, "flagged": true }).then((result1) => {
        const promises = result1.map((item) => {
          if (item['patientID'] === null) {
            const { _id, path, classification, object_detection, segmentation, date } = item
            const newItem = { "id": _id.toString(), "image": path, "patientUsername": null, "patientGender": null, "patientAge": null, "patientPhone": null, "patientEmail": null, classification, object_detection, segmentation, "date": date }
            image.push(newItem)
          }

          return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
            if (!result) {
              return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (result) {
                  const { _id, path, classification, object_detection, segmentation, date } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, "date": date }
                  image.push(newItem)
                }
              })
            } else {
              const { _id, path, classification, object_detection, segmentation, approved, date } = item
              const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], classification, object_detection, segmentation, "date": date }
              image.push(newItem)
            }
          })
        })

        Promise.all(promises)
          .then(() => {
            res.send({ "status": "true", "message": 'Get Flagged Images Successfully', "data": image })
          })
          .catch((err) => {
            console.error(err)
            res.send({ "status": "false", "message": err, "data": null })
          })


      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": e, "data": null });
  })
});

app.get('/doctorRequests', (req, res) => {
  var image = []
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (!result) {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      Images.find({ "doctorID": result['_id'].toString(), "classified": false, "approved": false }).then((result1) => {
        const promises = result1.map((item) => {
          return User.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
            if (!result) {
              return Patient.findOne({ '_id': new mongoose.Types.ObjectId(item['patientID']) }).then((result) => {
                if (result) {
                  const { _id, path, date } = item
                  const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['name'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], "date": date }
                  image.push(newItem)
                }
              })
            } else {
              const { _id, path, date } = item
              const newItem = { "id": _id.toString(), "image": path, "patientUsername": result['username'], "patientGender": result['gender'], "patientAge": result['age'], "patientPhone": result['phone'], "patientEmail": result['email'], "date": date }
              image.push(newItem)
            }
          })
        })

        Promise.all(promises)
          .then(() => {
            res.send({ "status": "true", "message": 'Get Requests Successfully', "data": image })
          })
          .catch((err) => {
            console.error(err)
            res.send({ "status": "false", "message": err, "data": null })
          })


      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
});

app.delete('/doctorDeleteImage', (req, res) => {
  const authHeader = req.headers['authorization'];
  let promises = [];
  let list = []
  let successCount = 0
  User.findOne({ tokens: authHeader }).then((resul => {
    if (!resul) {
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      for (let item of req.body) {
        const imageID = item.imageID
        if (imageID === "" || !('imageID' in item) || imageID === null) {
          list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
        }
        else if (item.imageID.length !== 24) {
          list.push({ "imageID": imageID, "status": 'false', "message": "Image id is wrong" })
        }
        else {
          let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
            if (result) {
              if (result['doctorID'].includes(resul['_id'].toString())) {
                let doctors = result["doctorID"]
                let valueToRemove = resul['_id'].toString();
                doctors = doctors.filter(item => item !== valueToRemove);
                return Images.updateOne({ "_id": new mongoose.Types.ObjectId(imageID) }, { "doctorID": doctors }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": imageID, "status": 'true', "message": "Done Successfully" });
                    successCount++
                  }
                  else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Unable to delete item" })
                  }
                }).catch((e) => {
                  console.log(e);
                  list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                })
              }
              else {
                return list.push({ "imageID": imageID, "status": 'false', "message": "Not found this image" })
              }
            }
            else {
              list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
            }
          })
          promises.push(promise)
        }
      }
      Promise.all(promises).then(() => {
        if (successCount === req.body.length) {
          res.send({ "status": "true", "message": 'Done Successfully', "data": list });
        } else if (successCount === 0) {
          res.send({ "status": "false", "message": 'Failed', "data": list });
        } else {
          res.send({ "status": "true", "message": 'Some items were deleted successfully, but others failed', "data": list });
        }
      }).catch((e) => {
        console.log(e);
        res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
      });
    }
  }))
})

app.post('/specific', specificUpload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const name = req.body.name
  const age = req.body.age
  const gender = req.body.gender
  const email = req.body.email
  const phone = req.body.phone
  if (!('file' in req) || req.file === null) {
    console.log("Please upload image");
    res.send({ "status": "false", "message": 'Please enter image', "data": null });
  }
  else if (!('name' in req.body) || req.body.name === null || req.body.name === '') {
    console.log("Please enter patient's name");
    res.send({ "status": "false", "message": "Please enter patient's name", "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }
      const data = [];

      const file = req.file;
      const patient = new Patient({ "name": name, "age": age, "gender": gender, "email": email, "phone": phone });
      try {
        await patient.save().then((result1) => {
          if (result1) {
            const currentDate = new Date();
            const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": result1['_id'].toString(), "flagged": false, "classified": false, "approved": false, 'date': currentDate });
            image.save();
            console.log(image);
            data.push(file.filename);
          }
        });
        console.log(patient);
      } catch (e) {
        console.log("failed:", e);
      }

      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });

      const options = {
        uri: 'http://127.0.0.1:8001/classify',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        const images = []
        const mri = []
        const mri1 = []
        const mri2 = []
        const mri3 = []
        const mri4 = []
        const mri5 = []
        const knee = []
        const brain = []
        const detect = []
        const detectX = []
        const xr = []
        const xr1 = []
        const xr2 = []

        var processesCompleted = 0 // initialize counter to zero
        var totalProcesses = 0 // initialize totalProcesses to zero
        if (!error && response.statusCode === 200) {
          for (let items of body) {
            images.push(items)
            Images.findOne({ name: items.image }).then((doc) => {
              const newClassification = {
                classification: items.classification,
                confidence: items.confidence
              };
              doc.classification.push(newClassification);
              doc.save().then((updatedDoc) => {
                console.log(updatedDoc);
              }).catch((e) => {
                console.log(e);
              })
            }).catch((e) => {
              console.log(e);
            })

            if (parseFloat(items.confidence) < 0.86) {
              Images.updateOne({ name: items.image }, { flagged: true }).then((result) => {
                if (result['acknowledged'] == true) {
                  console.log("flagged");
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
            else {
              console.log("not flagged");
            }

            if (items.classification == 'MRI') {
              mri.push(items.image)
              totalProcesses++ // add one to totalProcesses for each MRI image
            }

            else if (items.classification == 'XR') {
              xr.push(items.image)
              totalProcesses++ // add one to totalProcesses for each XR image
            }
          }
          if (mri.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8000/mri',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(mri)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let item of body) {
                  if (parseFloat(item.confidence) < 0.86) {
                    Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }
                  Images.findOne({ name: item.image }).then((doc) => {
                    const newClassification = {
                      classification: item.classification,
                      confidence: item.confidence
                    };
                    doc.classification.push(newClassification);
                    doc.save().then((updatedDoc) => {
                      console.log(updatedDoc);
                    }).catch((e) => {
                      console.log(e);
                    })
                  }).catch((e) => {
                    console.log(e);
                  })
                  if (item.classification == 'Knee') {
                    mri1.push(item)
                    knee.push(item.image)
                  }
                  else if (item.classification == 'Brain') {
                    mri3.push(item)
                    brain.push(item.image)
                  }
                }
                if (knee.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8002/knee',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(knee)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let itemsss of body) {
                        if (parseFloat(itemsss.confidence) < 0.86) {
                          Images.updateOne({ name: itemsss.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        Images.findOne({ name: itemsss.image }).then((doc) => {
                          const newClassification = {
                            classification: itemsss.classification,
                            confidence: itemsss.confidence
                          };
                          doc.classification.push(newClassification);
                          doc.save().then((updatedDoc) => {
                            console.log(updatedDoc);
                          }).catch((e) => {
                            console.log(e);
                          })
                        }).catch((e) => {
                          console.log(e);
                        })
                        mri2.push(itemsss)
                        processesCompleted++  // add one to processesCompleted for each completed process
                      }
                      if (processesCompleted === totalProcesses) {
                        let promises = [];

                        for (let item of data) {
                          promises.push(updateImage(item));
                        }

                        Promise.all(promises)
                          .then((results) => {
                            let list = results.filter((result) => result !== null);
                            res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                          })
                          .catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          });

                        async function updateImage(item) {
                          try {
                            await Images.updateOne({ "name": item }, { "classified": true });
                            let result = await Images.findOne({ "name": item });
                            return { "id": result['_id'].toString(), "image": result['path'] };
                          } catch (e) {
                            console.log(e);
                            return null;
                          }
                        }

                        /*const mergedList = [];
                        const imageMap = {};
                        [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2,].forEach((list) => {
                          list.forEach((item) => {
                            const existingItems = imageMap[item.image] || [];
                            existingItems.push(item);
                            imageMap[item.image] = existingItems;
                          });
                        });
                        // Convert the map to an array of arrays
                        Object.values(imageMap).forEach((itemArray) => {
                          mergedList.push(itemArray);
                        });
                        // Output the merged list
                        console.log(mergedList);
                        //res.send(mergedList)*/
                      }
                    }
                  });
                }
                if (brain.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8004/OD',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(brain)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        if (parseFloat(item.confidence) < 0.86) {
                          Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        console.log(item['Bounding Box']);
                        if (brain.includes(item.image)) {
                          if (!detect.includes(item.image)) {
                            const imagePath = `${loc}result/${item.image}`;
                            detect.push(item.image)
                            mri4.push(item)
                            Images.findOneAndUpdate({ name: item.image }, {
                              object_detection: {
                                object_detected: item.Object_Detected,
                                confidence: item.confidence,
                                image_object_detection: imagePath,
                                bounding_box: item['Bounding Box']
                              }
                            }, { new: true }).then(updatedImage => {
                              console.log('Image updated successfully:', updatedImage);
                            })
                              .catch(error => {
                                console.error('Error updating image:', error);
                              })
                          }
                        }
                      }

                      for (let item of brain) {
                        if (!detect.includes(item)) {
                          Images.findOneAndUpdate({ name: item }, {
                            object_detection: {
                              object_detected: "Negative",
                              confidence: '1.00',
                              image_object_detection: null,
                            }
                          }, { new: true }).then(updatedImage => {
                            console.log('Image updated successfully:', updatedImage);
                          })
                            .catch(error => {
                              console.error('Error updating image:', error);
                            })
                        }
                      }

                      if (detect.length < brain.length) {
                        processesCompleted = processesCompleted + (brain.length - detect.length)
                      }

                      if (processesCompleted === totalProcesses) {
                        let promises = [];

                        for (let item of data) {
                          promises.push(updateImage(item));
                        }

                        Promise.all(promises)
                          .then((results) => {
                            let list = results.filter((result) => result !== null);
                            res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                          })
                          .catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          });

                        async function updateImage(item) {
                          try {
                            await Images.updateOne({ "name": item }, { "classified": true });
                            let result = await Images.findOne({ "name": item });
                            return { "id": result['_id'].toString(), "image": result['path'] };
                          } catch (e) {
                            console.log(e);
                            return null;
                          }
                        }

                      }
                      if (detect.length > 0) {
                        const options = {
                          uri: 'http://127.0.0.1:8005/segment',
                          method: 'GET',
                          json: true,
                          qs: {
                            strings: decodeURIComponent(detect)
                          }
                        };
                        request(options, (error, response, body) => {
                          if (!error && response.statusCode === 200) {
                            for (let item of body) {
                              mri5.push(item)
                              processesCompleted++
                              Images.findOneAndUpdate({ name: item.image }, {
                                segmentation: {
                                  segmented_image: `${loc}result/segmented_${item.image}`,
                                  contour_image: `${loc}result/segmented_with_contour_${item.image}`,
                                  contour_coords: item.contour_coords
                                }
                              }, { new: true }).then(updatedImage => {
                                console.log('Image updated successfully:', updatedImage);
                              })
                                .catch(error => {
                                  console.error('Error updating image:', error);
                                })
                            }
                            if (processesCompleted === totalProcesses) {
                              let promises = [];

                              for (let item of data) {
                                promises.push(updateImage(item));
                              }

                              Promise.all(promises)
                                .then((results) => {
                                  let list = results.filter((result) => result !== null);
                                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                                })
                                .catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                });

                              async function updateImage(item) {
                                try {
                                  await Images.updateOne({ "name": item }, { "classified": true });
                                  let result = await Images.findOne({ "name": item });
                                  return { "id": result['_id'].toString(), "image": result['path'] };
                                } catch (e) {
                                  console.log(e);
                                  return null;
                                }
                              }
                              /*const mergedList = [];
                              const imageMap = {};
                              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                                list.forEach((item) => {
                                  const existingItems = imageMap[item.image] || [];
                                  existingItems.push(item);
                                  imageMap[item.image] = existingItems;
                                });
                              });
                              // Convert the map to an array of arrays
                              Object.values(imageMap).forEach((itemArray) => {
                                mergedList.push(itemArray);
                              });
                              // Output the merged list
                              console.log(mergedList);
                              res.send(mergedList)*/
                            }
                          }
                        });
                      }
                    }
                  });
                }
              }
            });
          }

          if (xr.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8003/xr',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(xr)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let item of body) {
                  if (parseFloat(item.confidence) < 0.86) {
                    Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }
                  xr1.push(item)
                  Images.findOne({ name: item.image }).then((doc) => {
                    const newClassification = {
                      classification: item.classification,
                      confidence: item.confidence
                    };
                    doc.classification.push(newClassification);
                    doc.save().then((updatedDoc) => {
                      console.log(updatedDoc);
                    }).catch((e) => {
                      console.log(e);
                    })
                  }).catch((e) => {
                    console.log(e);
                  })
                }
                const options = {
                  uri: 'http://127.0.0.1:8004/OD',
                  method: 'GET',
                  json: true,
                  qs: {
                    strings: decodeURIComponent(xr)
                  }
                };
                request(options, (error, response, body) => {
                  if (!error && response.statusCode === 200) {
                    for (let item of body) {
                      if (parseFloat(item.confidence) < 0.86) {
                        Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                          if (result['acknowledged'] == true) {
                            console.log("flagged");
                          }
                        }).catch((e) => {
                          console.log(e);
                          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                        })
                      }
                      else {
                        console.log("not flagged");
                      }
                      if (xr.includes(item.image)) {
                        if (!detectX.includes(item.image)) {
                          const imagePath = `${loc}result/${item.image}`;
                          processesCompleted++
                          xr2.push(item)
                          Images.findOneAndUpdate({ name: item.image }, {
                            object_detection: {
                              object_detected: item.Object_Detected,
                              confidence: item.confidence,
                              image_object_detection: imagePath,
                              bounding_box: item['Bounding Box']
                            }
                          }, { new: true }).then(updatedImage => {
                            console.log('Image updated successfully:', updatedImage);
                          })
                            .catch(error => {
                              console.error('Error updating image:', error);
                            })
                        }
                        detectX.push(item.image)
                      }
                    }
                    for (let item of xr) {
                      if (!detectX.includes(item)) {
                        Images.findOneAndUpdate({ name: item }, {
                          object_detection: {
                            object_detected: "Negative",
                            confidence: '1.00',
                            image_object_detection: null,
                          }
                        }, { new: true }).then(updatedImage => {
                          console.log('Image updated successfully:', updatedImage);
                        })
                          .catch(error => {
                            console.error('Error updating image:', error);
                          })
                      }
                    }
                    if (detectX.length < xr.length) {
                      processesCompleted = processesCompleted + (xr.length - detectX.length)
                    }
                    if (processesCompleted === totalProcesses) {
                      let promises = [];

                      for (let item of data) {
                        promises.push(updateImage(item));
                      }

                      Promise.all(promises)
                        .then((results) => {
                          let list = results.filter((result) => result !== null);
                          res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                        })
                        .catch((e) => {
                          console.log(e);
                          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                        });

                      async function updateImage(item) {
                        try {
                          await Images.updateOne({ "name": item }, { "classified": true });
                          let result = await Images.findOne({ "name": item });
                          return { "id": result['_id'].toString(), "image": result['path'] };
                        } catch (e) {
                          console.log(e);
                          return null;
                        }
                      }
                      /*const mergedList = [];
                      const imageMap = {};
                      [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                        list.forEach((item) => {
                          const existingItems = imageMap[item.image] || [];
                          existingItems.push(item);
                          imageMap[item.image] = existingItems;
                        });
                      });
                      // Convert the map to an array of arrays
                      Object.values(imageMap).forEach((itemArray) => {
                        mergedList.push(itemArray);
                      });
                      // Output the merged list
                      console.log(mergedList);
                      res.send(mergedList)*/
                    }
                  }
                });

              }
            });

          }

          else {
            if (processesCompleted === totalProcesses) {
              let promises = [];

              for (let item of data) {
                promises.push(updateImage(item));
              }

              Promise.all(promises)
                .then((results) => {
                  let list = results.filter((result) => result !== null);
                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                })
                .catch((e) => {
                  console.log(e);
                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                });

              async function updateImage(item) {
                try {
                  await Images.updateOne({ "name": item }, { "classified": true });
                  let result = await Images.findOne({ "name": item });
                  return { "id": result['_id'].toString(), "image": result['path'] };
                } catch (e) {
                  console.log(e);
                  return null;
                }
              }
              /*const mergedList = [];
              const imageMap = {};
              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                list.forEach((item) => {
                  const existingItems = imageMap[item.image] || [];
                  existingItems.push(item);
                  imageMap[item.image] = existingItems;
                });
              });
              // Convert the map to an array of arrays
              Object.values(imageMap).forEach((itemArray) => {
                mergedList.push(itemArray);
              });
              // Output the merged list
              console.log(mergedList);
              res.send(mergedList)*/
            }
          }

        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }
});

app.post('/classify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const image = req.body.imageID;
  if (image === "" || !('imageID' in req.body) || image === null) {
    console.log("Please enter image ID");
    res.send({ "status": "false", "message": 'Image id cannot be equal null', "data": null });
  }
  else if (image.length !== 24) {
    res.send({ "status": "false", "message": "Image id is wrong", "data": null })
  }
  else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
      else {
        Images.findOne({ _id: image }).then((result) => {
          if (!result) {
            console.log('Unauthorized');
            res.send({ "status": "false", "message": 'Image ID is not vaild', "data": null });
          }
          else {
            var data = []
            data.push(result['name'])
            const options = {
              uri: 'http://127.0.0.1:8001/classify',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(data)
              }
            };
            request(options, (error, response, body) => {
              const images = []
              const mri = []
              const mri1 = []
              const mri2 = []
              const mri3 = []
              const mri4 = []
              const mri5 = []
              const knee = []
              const brain = []
              const detect = []
              const detectX = []
              const xr = []
              const xr1 = []
              const xr2 = []

              var processesCompleted = 0 // initialize counter to zero
              var totalProcesses = 0 // initialize totalProcesses to zero
              if (!error && response.statusCode === 200) {
                for (let items of body) {
                  images.push(items)
                  Images.findOne({ name: items.image }).then((doc) => {
                    const newClassification = {
                      classification: items.classification,
                      confidence: items.confidence
                    };
                    doc.classification.push(newClassification);
                    doc.save().then((updatedDoc) => {
                      console.log(updatedDoc);
                    }).catch((e) => {
                      console.log(e);
                    })
                  }).catch((e) => {
                    console.log(e);
                  })

                  if (parseFloat(items.confidence) < 0.86) {
                    Images.updateOne({ name: items.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }

                  if (items.classification == 'MRI') {
                    mri.push(items.image)
                    totalProcesses++ // add one to totalProcesses for each MRI image
                  }

                  else if (items.classification == 'XR') {
                    xr.push(items.image)
                    totalProcesses++ // add one to totalProcesses for each XR image
                  }
                }
                if (mri.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8000/mri',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(mri)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        if (parseFloat(item.confidence) < 0.86) {
                          Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        Images.findOne({ name: item.image }).then((doc) => {
                          const newClassification = {
                            classification: item.classification,
                            confidence: item.confidence
                          };
                          doc.classification.push(newClassification);
                          doc.save().then((updatedDoc) => {
                            console.log(updatedDoc);
                          }).catch((e) => {
                            console.log(e);
                          })
                        }).catch((e) => {
                          console.log(e);
                        })
                        if (item.classification == 'Knee') {
                          mri1.push(item)
                          knee.push(item.image)
                        }
                        else if (item.classification == 'Brain') {
                          mri3.push(item)
                          brain.push(item.image)
                        }
                      }
                      if (knee.length > 0) {
                        const options = {
                          uri: 'http://127.0.0.1:8002/knee',
                          method: 'GET',
                          json: true,
                          qs: {
                            strings: decodeURIComponent(knee)
                          }
                        };
                        request(options, (error, response, body) => {
                          if (!error && response.statusCode === 200) {
                            for (let itemsss of body) {
                              if (parseFloat(itemsss.confidence) < 0.86) {
                                Images.updateOne({ name: itemsss.image }, { flagged: true }).then((result) => {
                                  if (result['acknowledged'] == true) {
                                    console.log("flagged");
                                  }
                                }).catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                })
                              }
                              else {
                                console.log("not flagged");
                              }
                              Images.findOne({ name: itemsss.image }).then((doc) => {
                                const newClassification = {
                                  classification: itemsss.classification,
                                  confidence: itemsss.confidence
                                };
                                doc.classification.push(newClassification);
                                doc.save().then((updatedDoc) => {
                                  console.log(updatedDoc);
                                }).catch((e) => {
                                  console.log(e);
                                })
                              }).catch((e) => {
                                console.log(e);
                              })
                              mri2.push(itemsss)
                              processesCompleted++  // add one to processesCompleted for each completed process
                            }
                            if (processesCompleted === totalProcesses) {
                              let promises = [];

                              for (let item of data) {
                                promises.push(updateImage(item));
                              }

                              Promise.all(promises)
                                .then((results) => {
                                  let list = results.filter((result) => result !== null);
                                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                                })
                                .catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                });

                              async function updateImage(item) {
                                try {
                                  await Images.updateOne({ "name": item }, { "classified": true });
                                  let result = await Images.findOne({ "name": item });
                                  return { "id": result['_id'].toString(), "image": result['path'] };
                                } catch (e) {
                                  console.log(e);
                                  return null;
                                }
                              }

                              /*const mergedList = [];
                              const imageMap = {};
                              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2,].forEach((list) => {
                                list.forEach((item) => {
                                  const existingItems = imageMap[item.image] || [];
                                  existingItems.push(item);
                                  imageMap[item.image] = existingItems;
                                });
                              });
                              // Convert the map to an array of arrays
                              Object.values(imageMap).forEach((itemArray) => {
                                mergedList.push(itemArray);
                              });
                              // Output the merged list
                              console.log(mergedList);
                              //res.send(mergedList)*/
                            }
                          }
                        });
                      }
                      if (brain.length > 0) {
                        const options = {
                          uri: 'http://127.0.0.1:8004/OD',
                          method: 'GET',
                          json: true,
                          qs: {
                            strings: decodeURIComponent(brain)
                          }
                        };
                        request(options, (error, response, body) => {
                          if (!error && response.statusCode === 200) {
                            for (let item of body) {
                              if (parseFloat(item.confidence) < 0.86) {
                                Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                                  if (result['acknowledged'] == true) {
                                    console.log("flagged");
                                  }
                                }).catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                })
                              }
                              else {
                                console.log("not flagged");
                              }
                              console.log(item['Bounding Box']);
                              if (brain.includes(item.image)) {
                                if (!detect.includes(item.image)) {
                                  const imagePath = `${loc}result/${item.image}`;
                                  detect.push(item.image)
                                  mri4.push(item)
                                  Images.findOneAndUpdate({ name: item.image }, {
                                    object_detection: {
                                      object_detected: item.Object_Detected,
                                      confidence: item.confidence,
                                      image_object_detection: imagePath,
                                      bounding_box: item['Bounding Box']
                                    }
                                  }, { new: true }).then(updatedImage => {
                                    console.log('Image updated successfully:', updatedImage);
                                  })
                                    .catch(error => {
                                      console.error('Error updating image:', error);
                                    })
                                }
                              }
                            }

                            for (let item of brain) {
                              if (!detect.includes(item)) {
                                Images.findOneAndUpdate({ name: item }, {
                                  object_detection: {
                                    object_detected: "Negative",
                                    confidence: '1.00',
                                    image_object_detection: null,
                                  }
                                }, { new: true }).then(updatedImage => {
                                  console.log('Image updated successfully:', updatedImage);
                                })
                                  .catch(error => {
                                    console.error('Error updating image:', error);
                                  })
                              }
                            }

                            if (detect.length < brain.length) {
                              processesCompleted = processesCompleted + (brain.length - detect.length)
                            }

                            if (processesCompleted === totalProcesses) {
                              let promises = [];

                              for (let item of data) {
                                promises.push(updateImage(item));
                              }

                              Promise.all(promises)
                                .then((results) => {
                                  let list = results.filter((result) => result !== null);
                                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                                })
                                .catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                });

                              async function updateImage(item) {
                                try {
                                  await Images.updateOne({ "name": item }, { "classified": true });
                                  let result = await Images.findOne({ "name": item });
                                  return { "id": result['_id'].toString(), "image": result['path'] };
                                } catch (e) {
                                  console.log(e);
                                  return null;
                                }
                              }
                              /*const mergedList = [];
                              const imageMap = {};
                              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                                list.forEach((item) => {
                                  const existingItems = imageMap[item.image] || [];
                                  existingItems.push(item);
                                  imageMap[item.image] = existingItems;
                                });
                              });
                              // Convert the map to an array of arrays
                              Object.values(imageMap).forEach((itemArray) => {
                                mergedList.push(itemArray);
                              });
                              // Output the merged list
                              console.log(mergedList);
                              res.send(mergedList)*/
                            }
                            if (detect.length > 0) {
                              const options = {
                                uri: 'http://127.0.0.1:8005/segment',
                                method: 'GET',
                                json: true,
                                qs: {
                                  strings: decodeURIComponent(detect)
                                }
                              };
                              request(options, (error, response, body) => {
                                if (!error && response.statusCode === 200) {
                                  for (let item of body) {
                                    mri5.push(item)
                                    processesCompleted++
                                    Images.findOneAndUpdate({ name: item.image }, {
                                      segmentation: {
                                        segmented_image: `${loc}result/segmented_${item.image}`,
                                        contour_image: `${loc}result/segmented_with_contour_${item.image}`,
                                        contour_coords: item.contour_coords
                                      }
                                    }, { new: true }).then(updatedImage => {
                                      console.log('Image updated successfully:', updatedImage);
                                    })
                                      .catch(error => {
                                        console.error('Error updating image:', error);
                                      })
                                  }
                                  if (processesCompleted === totalProcesses) {
                                    let promises = [];

                                    for (let item of data) {
                                      promises.push(updateImage(item));
                                    }

                                    Promise.all(promises)
                                      .then((results) => {
                                        let list = results.filter((result) => result !== null);
                                        res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                                      })
                                      .catch((e) => {
                                        console.log(e);
                                        res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                      });

                                    async function updateImage(item) {
                                      try {
                                        await Images.updateOne({ "name": item }, { "classified": true });
                                        let result = await Images.findOne({ "name": item });
                                        return { "id": result['_id'].toString(), "image": result['path'] };
                                      } catch (e) {
                                        console.log(e);
                                        return null;
                                      }
                                    }
                                    /*const mergedList = [];
                                    const imageMap = {};
                                    [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                                      list.forEach((item) => {
                                        const existingItems = imageMap[item.image] || [];
                                        existingItems.push(item);
                                        imageMap[item.image] = existingItems;
                                      });
                                    });
                                    // Convert the map to an array of arrays
                                    Object.values(imageMap).forEach((itemArray) => {
                                      mergedList.push(itemArray);
                                    });
                                    // Output the merged list
                                    console.log(mergedList);
                                    res.send(mergedList)*/
                                  }
                                }
                              });
                            }
                          }
                        });
                      }
                    }
                  });
                }

                if (xr.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8003/xr',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(xr)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        if (parseFloat(item.confidence) < 0.86) {
                          Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        xr1.push(item)
                        Images.findOne({ name: item.image }).then((doc) => {
                          const newClassification = {
                            classification: item.classification,
                            confidence: item.confidence
                          };
                          doc.classification.push(newClassification);
                          doc.save().then((updatedDoc) => {
                            console.log(updatedDoc);
                          }).catch((e) => {
                            console.log(e);
                          })
                        }).catch((e) => {
                          console.log(e);
                        })
                      }
                      const options = {
                        uri: 'http://127.0.0.1:8004/OD',
                        method: 'GET',
                        json: true,
                        qs: {
                          strings: decodeURIComponent(xr)
                        }
                      };
                      request(options, (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                          for (let item of body) {
                            if (parseFloat(item.confidence) < 0.86) {
                              Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                                if (result['acknowledged'] == true) {
                                  console.log("flagged");
                                }
                              }).catch((e) => {
                                console.log(e);
                                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                              })
                            }
                            else {
                              console.log("not flagged");
                            }
                            if (xr.includes(item.image)) {
                              if (!detectX.includes(item.image)) {
                                const imagePath = `${loc}result/${item.image}`;
                                processesCompleted++
                                xr2.push(item)
                                Images.findOneAndUpdate({ name: item.image }, {
                                  object_detection: {
                                    object_detected: item.Object_Detected,
                                    confidence: item.confidence,
                                    image_object_detection: imagePath,
                                    bounding_box: item['Bounding Box']
                                  }
                                }, { new: true }).then(updatedImage => {
                                  console.log('Image updated successfully:', updatedImage);
                                })
                                  .catch(error => {
                                    console.error('Error updating image:', error);
                                  })
                              }
                              detectX.push(item.image)
                            }
                          }
                          for (let item of xr) {
                            if (!detectX.includes(item)) {
                              Images.findOneAndUpdate({ name: item }, {
                                object_detection: {
                                  object_detected: "Negative",
                                  confidence: '1.00',
                                  image_object_detection: null,
                                }
                              }, { new: true }).then(updatedImage => {
                                console.log('Image updated successfully:', updatedImage);
                              })
                                .catch(error => {
                                  console.error('Error updating image:', error);
                                })
                            }
                          }
                          if (detectX.length < xr.length) {
                            processesCompleted = processesCompleted + (xr.length - detectX.length)
                          }
                          if (processesCompleted === totalProcesses) {
                            let promises = [];

                            for (let item of data) {
                              promises.push(updateImage(item));
                            }

                            Promise.all(promises)
                              .then((results) => {
                                let list = results.filter((result) => result !== null);
                                res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                              })
                              .catch((e) => {
                                console.log(e);
                                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                              });

                            async function updateImage(item) {
                              try {
                                await Images.updateOne({ "name": item }, { "classified": true });
                                let result = await Images.findOne({ "name": item });
                                return { "id": result['_id'].toString(), "image": result['path'] };
                              } catch (e) {
                                console.log(e);
                                return null;
                              }
                            }
                            /*const mergedList = [];
                            const imageMap = {};
                            [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                              list.forEach((item) => {
                                const existingItems = imageMap[item.image] || [];
                                existingItems.push(item);
                                imageMap[item.image] = existingItems;
                              });
                            });
                            // Convert the map to an array of arrays
                            Object.values(imageMap).forEach((itemArray) => {
                              mergedList.push(itemArray);
                            });
                            // Output the merged list
                            console.log(mergedList);
                            res.send(mergedList)*/
                          }
                        }
                      });

                    }
                  });

                }

                else {
                  if (processesCompleted === totalProcesses) {
                    let promises = [];

                    for (let item of data) {
                      promises.push(updateImage(item));
                    }

                    Promise.all(promises)
                      .then((results) => {
                        let list = results.filter((result) => result !== null);
                        res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                      })
                      .catch((e) => {
                        console.log(e);
                        res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                      });

                    async function updateImage(item) {
                      try {
                        await Images.updateOne({ "name": item }, { "classified": true });
                        let result = await Images.findOne({ "name": item });
                        return { "id": result['_id'].toString(), "image": result['path'] };
                      } catch (e) {
                        console.log(e);
                        return null;
                      }
                    }
                    /*const mergedList = [];
                    const imageMap = {};
                    [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                      list.forEach((item) => {
                        const existingItems = imageMap[item.image] || [];
                        existingItems.push(item);
                        imageMap[item.image] = existingItems;
                      });
                    });
                    // Convert the map to an array of arrays
                    Object.values(imageMap).forEach((itemArray) => {
                      mergedList.push(itemArray);
                    });
                    // Output the merged list
                    console.log(mergedList);
                    res.send(mergedList)*/
                  }
                }

              }
            });
          }
        }).catch((e) => {
          console.log(e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        })
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

});

app.post('/general', upload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(req.files);
  if (!('files' in req) || req.files.length === 0) {
    console.log("Please enter images");
    res.send({ "status": "false", "message": 'Please enter images', "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }
      const data = [];
      const files = req.files;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentDate = new Date();
        const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": null, "flagged": false, "classified": false, "approved": false, "date": currentDate });
        try {
          await image.save();
          console.log(image);
          data.push(file.filename);
        } catch (e) {
          console.log("failed:", e);
        }
      }

      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });

      const options = {
        uri: 'http://127.0.0.1:8001/classify',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        const images = []
        const mri = []
        const mri1 = []
        const mri2 = []
        const mri3 = []
        const mri4 = []
        const mri5 = []
        const knee = []
        const brain = []
        const detect = []
        const detectX = []
        const xr = []
        const xr1 = []
        const xr2 = []

        var processesCompleted = 0 // initialize counter to zero
        var totalProcesses = 0 // initialize totalProcesses to zero
        if (!error && response.statusCode === 200) {
          for (let items of body) {
            images.push(items)
            Images.findOne({ name: items.image }).then((doc) => {
              const newClassification = {
                classification: items.classification,
                confidence: items.confidence
              };
              doc.classification.push(newClassification);
              doc.save().then((updatedDoc) => {
                console.log(updatedDoc);
              }).catch((e) => {
                console.log(e);
              })
            }).catch((e) => {
              console.log(e);
            })

            if (parseFloat(items.confidence) < 0.86) {
              Images.updateOne({ name: items.image }, { flagged: true }).then((result) => {
                if (result['acknowledged'] == true) {
                  console.log("flagged");
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
            else {
              console.log("not flagged");
            }

            if (items.classification == 'MRI') {
              mri.push(items.image)
              totalProcesses++ // add one to totalProcesses for each MRI image
            }

            else if (items.classification == 'XR') {
              xr.push(items.image)
              totalProcesses++ // add one to totalProcesses for each XR image
            }
          }
          if (mri.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8000/mri',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(mri)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let item of body) {
                  if (parseFloat(item.confidence) < 0.86) {
                    Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }
                  Images.findOne({ name: item.image }).then((doc) => {
                    const newClassification = {
                      classification: item.classification,
                      confidence: item.confidence
                    };
                    doc.classification.push(newClassification);
                    doc.save().then((updatedDoc) => {
                      console.log(updatedDoc);
                    }).catch((e) => {
                      console.log(e);
                    })
                  }).catch((e) => {
                    console.log(e);
                  })
                  if (item.classification == 'Knee') {
                    mri1.push(item)
                    knee.push(item.image)
                  }
                  else if (item.classification == 'Brain') {
                    mri3.push(item)
                    brain.push(item.image)
                  }
                }
                if (knee.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8002/knee',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(knee)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let itemsss of body) {
                        if (parseFloat(itemsss.confidence) < 0.86) {
                          Images.updateOne({ name: itemsss.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        Images.findOne({ name: itemsss.image }).then((doc) => {
                          const newClassification = {
                            classification: itemsss.classification,
                            confidence: itemsss.confidence
                          };
                          doc.classification.push(newClassification);
                          doc.save().then((updatedDoc) => {
                            console.log(updatedDoc);
                          }).catch((e) => {
                            console.log(e);
                          })
                        }).catch((e) => {
                          console.log(e);
                        })
                        mri2.push(itemsss)
                        processesCompleted++  // add one to processesCompleted for each completed process
                      }
                      if (processesCompleted === totalProcesses) {
                        let promises = [];

                        for (let item of data) {
                          promises.push(updateImage(item));
                        }

                        Promise.all(promises)
                          .then((results) => {
                            let list = results.filter((result) => result !== null);
                            res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                          })
                          .catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          });

                        async function updateImage(item) {
                          try {
                            await Images.updateOne({ "name": item }, { "classified": true });
                            let result = await Images.findOne({ "name": item });
                            return { "id": result['_id'].toString(), "image": result['path'] };
                          } catch (e) {
                            console.log(e);
                            return null;
                          }
                        }

                        /*const mergedList = [];
                        const imageMap = {};
                        [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2,].forEach((list) => {
                          list.forEach((item) => {
                            const existingItems = imageMap[item.image] || [];
                            existingItems.push(item);
                            imageMap[item.image] = existingItems;
                          });
                        });
                        // Convert the map to an array of arrays
                        Object.values(imageMap).forEach((itemArray) => {
                          mergedList.push(itemArray);
                        });
                        // Output the merged list
                        console.log(mergedList);
                        //res.send(mergedList)*/
                      }
                    }
                  });
                }
                if (brain.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8004/OD',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(brain)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        if (parseFloat(item.confidence) < 0.86) {
                          Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        console.log(item['Bounding Box']);
                        if (brain.includes(item.image)) {
                          if (!detect.includes(item.image)) {
                            const imagePath = `${loc}result/${item.image}`;
                            detect.push(item.image)
                            mri4.push(item)
                            Images.findOneAndUpdate({ name: item.image }, {
                              object_detection: {
                                object_detected: item.Object_Detected,
                                confidence: item.confidence,
                                image_object_detection: imagePath,
                                bounding_box: item['Bounding Box']
                              }
                            }, { new: true }).then(updatedImage => {
                              console.log('Image updated successfully:', updatedImage);
                            })
                              .catch(error => {
                                console.error('Error updating image:', error);
                              })
                          }
                        }
                      }

                      for (let item of brain) {
                        if (!detect.includes(item)) {
                          Images.findOneAndUpdate({ name: item }, {
                            object_detection: {
                              object_detected: "Negative",
                              confidence: '1.00',
                              image_object_detection: null,
                            }
                          }, { new: true }).then(updatedImage => {
                            console.log('Image updated successfully:', updatedImage);
                          })
                            .catch(error => {
                              console.error('Error updating image:', error);
                            })
                        }
                      }

                      if (detect.length < brain.length) {
                        processesCompleted = processesCompleted + (brain.length - detect.length)
                      }

                      if (processesCompleted === totalProcesses) {
                        let promises = [];

                        for (let item of data) {
                          promises.push(updateImage(item));
                        }

                        Promise.all(promises)
                          .then((results) => {
                            let list = results.filter((result) => result !== null);
                            res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                          })
                          .catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          });

                        async function updateImage(item) {
                          try {
                            await Images.updateOne({ "name": item }, { "classified": true });
                            let result = await Images.findOne({ "name": item });
                            return { "id": result['_id'].toString(), "image": result['path'] };
                          } catch (e) {
                            console.log(e);
                            return null;
                          }
                        }

                      }
                      if (detect.length > 0) {
                        const options = {
                          uri: 'http://127.0.0.1:8005/segment',
                          method: 'GET',
                          json: true,
                          qs: {
                            strings: decodeURIComponent(detect)
                          }
                        };
                        request(options, (error, response, body) => {
                          if (!error && response.statusCode === 200) {
                            for (let item of body) {
                              mri5.push(item)
                              processesCompleted++
                              Images.findOneAndUpdate({ name: item.image }, {
                                segmentation: {
                                  segmented_image: `${loc}result/segmented_${item.image}`,
                                  contour_image: `${loc}result/segmented_with_contour_${item.image}`,
                                  contour_coords: item.contour_coords
                                }
                              }, { new: true }).then(updatedImage => {
                                console.log('Image updated successfully:', updatedImage);
                              })
                                .catch(error => {
                                  console.error('Error updating image:', error);
                                })
                            }
                            if (processesCompleted === totalProcesses) {
                              let promises = [];

                              for (let item of data) {
                                promises.push(updateImage(item));
                              }

                              Promise.all(promises)
                                .then((results) => {
                                  let list = results.filter((result) => result !== null);
                                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                                })
                                .catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                });

                              async function updateImage(item) {
                                try {
                                  await Images.updateOne({ "name": item }, { "classified": true });
                                  let result = await Images.findOne({ "name": item });
                                  return { "id": result['_id'].toString(), "image": result['path'] };
                                } catch (e) {
                                  console.log(e);
                                  return null;
                                }
                              }
                              /*const mergedList = [];
                              const imageMap = {};
                              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                                list.forEach((item) => {
                                  const existingItems = imageMap[item.image] || [];
                                  existingItems.push(item);
                                  imageMap[item.image] = existingItems;
                                });
                              });
                              // Convert the map to an array of arrays
                              Object.values(imageMap).forEach((itemArray) => {
                                mergedList.push(itemArray);
                              });
                              // Output the merged list
                              console.log(mergedList);
                              res.send(mergedList)*/
                            }
                          }
                        });
                      }
                    }
                  });
                }
              }
            });
          }

          if (xr.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8003/xr',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(xr)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let item of body) {
                  if (parseFloat(item.confidence) < 0.86) {
                    Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }
                  xr1.push(item)
                  Images.findOne({ name: item.image }).then((doc) => {
                    const newClassification = {
                      classification: item.classification,
                      confidence: item.confidence
                    };
                    doc.classification.push(newClassification);
                    doc.save().then((updatedDoc) => {
                      console.log(updatedDoc);
                    }).catch((e) => {
                      console.log(e);
                    })
                  }).catch((e) => {
                    console.log(e);
                  })
                }
                const options = {
                  uri: 'http://127.0.0.1:8004/OD',
                  method: 'GET',
                  json: true,
                  qs: {
                    strings: decodeURIComponent(xr)
                  }
                };
                request(options, (error, response, body) => {
                  if (!error && response.statusCode === 200) {
                    for (let item of body) {
                      if (parseFloat(item.confidence) < 0.86) {
                        Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                          if (result['acknowledged'] == true) {
                            console.log("flagged");
                          }
                        }).catch((e) => {
                          console.log(e);
                          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                        })
                      }
                      else {
                        console.log("not flagged");
                      }
                      if (xr.includes(item.image)) {
                        if (!detectX.includes(item.image)) {
                          const imagePath = `${loc}result/${item.image}`;
                          processesCompleted++
                          xr2.push(item)
                          Images.findOneAndUpdate({ name: item.image }, {
                            object_detection: {
                              object_detected: item.Object_Detected,
                              confidence: item.confidence,
                              image_object_detection: imagePath,
                              bounding_box: item['Bounding Box']
                            }
                          }, { new: true }).then(updatedImage => {
                            console.log('Image updated successfully:', updatedImage);
                          })
                            .catch(error => {
                              console.error('Error updating image:', error);
                            })
                        }
                        detectX.push(item.image)
                      }
                    }
                    for (let item of xr) {
                      if (!detectX.includes(item)) {
                        Images.findOneAndUpdate({ name: item }, {
                          object_detection: {
                            object_detected: "Negative",
                            confidence: '1.00',
                            image_object_detection: null,
                          }
                        }, { new: true }).then(updatedImage => {
                          console.log('Image updated successfully:', updatedImage);
                        })
                          .catch(error => {
                            console.error('Error updating image:', error);
                          })
                      }
                    }
                    if (detectX.length < xr.length) {
                      processesCompleted = processesCompleted + (xr.length - detectX.length)
                    }
                    if (processesCompleted === totalProcesses) {
                      let promises = [];

                      for (let item of data) {
                        promises.push(updateImage(item));
                      }

                      Promise.all(promises)
                        .then((results) => {
                          let list = results.filter((result) => result !== null);
                          res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                        })
                        .catch((e) => {
                          console.log(e);
                          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                        });

                      async function updateImage(item) {
                        try {
                          await Images.updateOne({ "name": item }, { "classified": true });
                          let result = await Images.findOne({ "name": item });
                          return { "id": result['_id'].toString(), "image": result['path'] };
                        } catch (e) {
                          console.log(e);
                          return null;
                        }
                      }

                      /*const mergedList = [];
                      const imageMap = {};
                      [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                        list.forEach((item) => {
                          const existingItems = imageMap[item.image] || [];
                          existingItems.push(item);
                          imageMap[item.image] = existingItems;
                        });
                      });
                      // Convert the map to an array of arrays
                      Object.values(imageMap).forEach((itemArray) => {
                        mergedList.push(itemArray);
                      });
                      // Output the merged list
                      console.log(mergedList);
                      res.send(mergedList)*/
                    }
                  }
                });

              }
            });

          }

          else {
            if (processesCompleted === totalProcesses) {
              let promises = [];

              for (let item of data) {
                promises.push(updateImage(item));
              }

              Promise.all(promises)
                .then((results) => {
                  let list = results.filter((result) => result !== null);
                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                })
                .catch((e) => {
                  console.log(e);
                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                });

              async function updateImage(item) {
                try {
                  await Images.updateOne({ "name": item }, { "classified": true });
                  let result = await Images.findOne({ "name": item });
                  return { "id": result['_id'].toString(), "image": result['path'] };
                } catch (e) {
                  console.log(e);
                  return null;
                }
              }
              /*const mergedList = [];
              const imageMap = {};
              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                list.forEach((item) => {
                  const existingItems = imageMap[item.image] || [];
                  existingItems.push(item);
                  imageMap[item.image] = existingItems;
                });
              });
              // Convert the map to an array of arrays
              Object.values(imageMap).forEach((itemArray) => {
                mergedList.push(itemArray);
              });
              // Output the merged list
              console.log(mergedList);
              res.send(mergedList)*/
            }
          }

        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }

});

app.post('/mri', upload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  if (!('files' in req) || req.files.length === 0) {
    console.log("Please enter images");
    res.send({ "status": "false", "message": 'Please enter images', "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }

      console.log(`Token found: ${result['tokens']}`);
      const data = [];
      const files = req.files;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentDate = new Date();
        const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": null, "flagged": false, "classified": false, "approved": false, "date": currentDate });
        try {
          await image.save();
          console.log(image);
          data.push(file.filename);
        } catch (e) {
          console.log("failed:", e);
        }
      }

      // Send the POST request after a delay of 100 milliseconds
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });

      const options = {
        uri: 'http://127.0.0.1:8000/mri',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        const mri1 = []
        const mri2 = []
        const mri3 = []
        const mri4 = []
        const mri5 = []
        const knee = []
        const brain = []
        const detect = []

        var processesCompleted = 0 // initialize counter to zero
        var totalProcesses = 0 // initialize totalProcesses to zero
        if (!error && response.statusCode === 200) {
          for (let item of body) {
            if (parseFloat(item.confidence) < 0.86) {
              Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                if (result['acknowledged'] === true) {
                  console.log("flagged");
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
            else {
              console.log("not flagged");
            }
            Images.findOne({ name: item.image }).then((doc) => {
              const newClassification = {
                classification: item.classification,
                confidence: item.confidence
              };
              doc.classification.push(newClassification);
              doc.save().then((updatedDoc) => {
                console.log(updatedDoc);
              }).catch((e) => {
                console.log(e);
              })
            }).catch((e) => {
              console.log(e);
            })
            if (item.classification == 'Knee') {
              mri1.push(item)
              knee.push(item.image)
              totalProcesses++
            }
            else if (item.classification == 'Brain') {
              mri3.push(item)
              brain.push(item.image)
              totalProcesses++
            }
          }
          if (knee.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8002/knee',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(knee)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let itemsss of body) {
                  if (parseFloat(itemsss.confidence) < 0.86) {
                    Images.updateOne({ name: itemsss.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }
                  Images.findOne({ name: itemsss.image }).then((doc) => {
                    const newClassification = {
                      classification: itemsss.classification,
                      confidence: itemsss.confidence
                    };
                    doc.classification.push(newClassification);
                    doc.save().then((updatedDoc) => {
                      console.log(updatedDoc);
                    }).catch((e) => {
                      console.log(e);
                    })
                  }).catch((e) => {
                    console.log(e);
                  })
                  mri2.push(itemsss)
                  processesCompleted++  // add one to processesCompleted for each completed process
                }
                if (processesCompleted === totalProcesses) {
                  let promises = [];

                  for (let item of data) {
                    promises.push(updateImage(item));
                  }

                  Promise.all(promises)
                    .then((results) => {
                      let list = results.filter((result) => result !== null);
                      res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                    })
                    .catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    });

                  async function updateImage(item) {
                    try {
                      await Images.updateOne({ "name": item }, { "classified": true });
                      let result = await Images.findOne({ "name": item });
                      return { "id": result['_id'].toString(), "image": result['path'] };
                    } catch (e) {
                      console.log(e);
                      return null;
                    }
                  }

                  /*const mergedList = [];
                  const imageMap = {};
                  [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2,].forEach((list) => {
                    list.forEach((item) => {
                      const existingItems = imageMap[item.image] || [];
                      existingItems.push(item);
                      imageMap[item.image] = existingItems;
                    });
                  });
                  // Convert the map to an array of arrays
                  Object.values(imageMap).forEach((itemArray) => {
                    mergedList.push(itemArray);
                  });
                  // Output the merged list
                  console.log(mergedList);
                  //res.send(mergedList)*/
                }
              }
            });
          }
          if (brain.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8004/OD',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(brain)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let item of body) {
                  if (parseFloat(item.confidence) < 0.86) {
                    Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                      if (result['acknowledged'] == true) {
                        console.log("flagged");
                      }
                    }).catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    })
                  }
                  else {
                    console.log("not flagged");
                  }
                  console.log(item['Bounding Box']);
                  if (brain.includes(item.image)) {
                    if (!detect.includes(item.image)) {
                      const imagePath = `${loc}result/${item.image}`;
                      detect.push(item.image)
                      mri4.push(item)
                      Images.findOneAndUpdate({ name: item.image }, {
                        object_detection: {
                          object_detected: item.Object_Detected,
                          confidence: item.confidence,
                          image_object_detection: imagePath,
                          bounding_box: item['Bounding Box']
                        }
                      }, { new: true }).then(updatedImage => {
                        console.log('Image updated successfully:', updatedImage);
                      })
                        .catch(error => {
                          console.error('Error updating image:', error);
                        })
                    }
                  }
                }

                for (let item of brain) {
                  if (!detect.includes(item)) {
                    Images.findOneAndUpdate({ name: item }, {
                      object_detection: {
                        object_detected: "Negative",
                        confidence: '1.00',
                        image_object_detection: null,
                      }
                    }, { new: true }).then(updatedImage => {
                      console.log('Image updated successfully:', updatedImage);
                    })
                      .catch(error => {
                        console.error('Error updating image:', error);
                      })
                  }
                }

                if (detect.length < brain.length) {
                  processesCompleted = processesCompleted + (brain.length - detect.length)
                }

                if (processesCompleted === totalProcesses) {
                  let promises = [];

                  for (let item of data) {
                    promises.push(updateImage(item));
                  }

                  Promise.all(promises)
                    .then((results) => {
                      let list = results.filter((result) => result !== null);
                      res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                    })
                    .catch((e) => {
                      console.log(e);
                      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                    });

                  async function updateImage(item) {
                    try {
                      await Images.updateOne({ "name": item }, { "classified": true });
                      let result = await Images.findOne({ "name": item });
                      return { "id": result['_id'].toString(), "image": result['path'] };
                    } catch (e) {
                      console.log(e);
                      return null;
                    }
                  }
                  /*const mergedList = [];
                  const imageMap = {};
                  [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                    list.forEach((item) => {
                      const existingItems = imageMap[item.image] || [];
                      existingItems.push(item);
                      imageMap[item.image] = existingItems;
                    });
                  });
                  // Convert the map to an array of arrays
                  Object.values(imageMap).forEach((itemArray) => {
                    mergedList.push(itemArray);
                  });
                  // Output the merged list
                  console.log(mergedList);
                  res.send(mergedList)*/
                }
                if (detect.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8005/segment',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(detect)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        mri5.push(item)
                        processesCompleted++
                        Images.findOneAndUpdate({ name: item.image }, {
                          segmentation: {
                            segmented_image: `${loc}result/segmented_${item.image}`,
                            contour_image: `${loc}result/segmented_with_contour_${item.image}`,
                            contour_coords: item.contour_coords
                          }
                        }, { new: true }).then(updatedImage => {
                          console.log('Image updated successfully:', updatedImage);
                        })
                          .catch(error => {
                            console.error('Error updating image:', error);
                          })
                      }
                      if (processesCompleted === totalProcesses) {
                        let promises = [];

                        for (let item of data) {
                          promises.push(updateImage(item));
                        }

                        Promise.all(promises)
                          .then((results) => {
                            let list = results.filter((result) => result !== null);
                            res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                          })
                          .catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          });

                        async function updateImage(item) {
                          try {
                            await Images.updateOne({ "name": item }, { "classified": true });
                            let result = await Images.findOne({ "name": item });
                            return { "id": result['_id'].toString(), "image": result['path'] };
                          } catch (e) {
                            console.log(e);
                            return null;
                          }
                        }

                      }
                    }
                  });
                }
              }
            });
          }
        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }

});

app.post('/knee', upload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  if (!('files' in req) || req.files.length === 0) {
    console.log("Please enter images");
    res.send({ "status": "false", "message": 'Please enter images', "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }

      console.log(`Token found: ${result['tokens']}`);
      const data = [];
      const files = req.files;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentDate = new Date();
        const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": null, "flagged": false, "classified": false, "approved": false, "date": currentDate });
        try {
          await image.save();
          console.log(image);
          data.push(file.filename);
        } catch (e) {
          console.log("failed:", e);
        }
      }

      // Send the POST request after a delay of 100 milliseconds
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });
      const mri2 = []

      var processesCompleted = 0 // initialize counter to zero
      var totalProcesses = 0 // initialize totalProcesses to zero

      const options = {
        uri: 'http://127.0.0.1:8002/knee',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          for (let itemsss of body) {
            if (parseFloat(itemsss.confidence) < 0.86) {
              Images.updateOne({ name: itemsss.image }, { flagged: true }).then((result) => {
                if (result['acknowledged'] == true) {
                  console.log("flagged");
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
            else {
              console.log("not flagged");
            }
            Images.findOne({ name: itemsss.image }).then((doc) => {
              const newClassification = {
                classification: itemsss.classification,
                confidence: itemsss.confidence
              };
              doc.classification.push(newClassification);
              doc.save().then((updatedDoc) => {
                console.log(updatedDoc);
              }).catch((e) => {
                console.log(e);
              })
            }).catch((e) => {
              console.log(e);
            })
            mri2.push(itemsss)
            totalProcesses++
            processesCompleted++   // add one to processesCompleted for each completed process
          }
          if (processesCompleted === totalProcesses) {
            let promises = [];

            for (let item of data) {
              promises.push(updateImage(item));
            }

            Promise.all(promises)
              .then((results) => {
                let list = results.filter((result) => result !== null);
                res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
              })
              .catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              });

            async function updateImage(item) {
              try {
                await Images.updateOne({ "name": item }, { "classified": true });
                let result = await Images.findOne({ "name": item });
                return { "id": result['_id'].toString(), "image": result['path'] };
              } catch (e) {
                console.log(e);
                return null;
              }
            }

            /*const mergedList = [];
            const imageMap = {};
            [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2,].forEach((list) => {
              list.forEach((item) => {
                const existingItems = imageMap[item.image] || [];
                existingItems.push(item);
                imageMap[item.image] = existingItems;
              });
            });
            // Convert the map to an array of arrays
            Object.values(imageMap).forEach((itemArray) => {
              mergedList.push(itemArray);
            });
            // Output the merged list
            console.log(mergedList);
            //res.send(mergedList)*/
          }
        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }

});

app.post('/segmentation', upload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  if (!('files' in req) || req.files.length === 0) {
    console.log("Please enter images");
    res.send({ "status": "false", "message": 'Please enter images', "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }

      console.log(`Token found: ${result['tokens']}`);
      const data = [];
      const files = req.files;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentDate = new Date();
        const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": null, "flagged": false, "classified": false, "approved": false, "date": currentDate });
        try {
          await image.save();
          console.log(image);
          data.push(file.filename);
        } catch (e) {
          console.log("failed:", e);
        }
      }

      // Send the POST request after a delay of 100 milliseconds
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });

      const mri5 = []

      var processesCompleted = 0 // initialize counter to zero
      var totalProcesses = 0 // initialize totalProcesses to zero

      const options = {
        uri: '127.0.0.1:8005/segment',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          for (let item of body) {
            mri5.push(item)
            totalProcesses++
            processesCompleted++
            Images.findOneAndUpdate({ name: item.image }, {
              segmentation: {
                segmented_image: `${loc}result/segmented_${item.image}`,
                contour_image: `${loc}result/segmented_with_contour_${item.image}`,
                contour_coords: item.contour_coords
              }
            }, { new: true }).then(updatedImage => {
              console.log('Image updated successfully:', updatedImage);
            })
              .catch(error => {
                console.error('Error updating image:', error);
              })
          }
          if (processesCompleted === totalProcesses) {
            let promises = [];

            for (let item of data) {
              promises.push(updateImage(item));
            }

            Promise.all(promises)
              .then((results) => {
                let list = results.filter((result) => result !== null);
                res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
              })
              .catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              });

            async function updateImage(item) {
              try {
                await Images.updateOne({ "name": item }, { "classified": true });
                let result = await Images.findOne({ "name": item });
                return { "id": result['_id'].toString(), "image": result['path'] };
              } catch (e) {
                console.log(e);
                return null;
              }
            }
          }
        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }

});

app.post('/objectDetection', upload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  if (!('files' in req) || req.files.length === 0) {
    console.log("Please enter images");
    res.send({ "status": "false", "message": 'Please enter images', "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }

      console.log(`Token found: ${result['tokens']}`);
      const data = [];
      const files = req.files;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentDate = new Date();
        const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": null, "flagged": false, "classified": false, "approved": false, "date": currentDate });
        try {
          await image.save();
          console.log(image);
          data.push(file.filename);
        } catch (e) {
          console.log("failed:", e);
        }
      }

      // Send the POST request after a delay of 100 milliseconds
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });
      const options = {
        uri: 'http://127.0.0.1:8001/classify',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        const images = []
        const mri = []
        const mri1 = []
        const mri2 = []
        const mri3 = []
        const mri4 = []
        const mri5 = []
        const knee = []
        const brain = []
        const detect = []
        const detectX = []
        const xr = []
        const xr1 = []
        const xr2 = []

        var processesCompleted = 0 // initialize counter to zero
        var totalProcesses = 0 // initialize totalProcesses to zero
        if (!error && response.statusCode === 200) {
          for (let items of body) {
            //images.push(items)
            Images.findOne({ name: items.image }).then((doc) => {
              const newClassification = {
                classification: items.classification,
                confidence: items.confidence
              };
              doc.classification.push(newClassification);
              doc.save().then((updatedDoc) => {
                console.log(updatedDoc);
              }).catch((e) => {
                console.log(e);
              })
            }).catch((e) => {
              console.log(e);
            })

            if (parseFloat(items.confidence) < 0.86) {
              Images.updateOne({ name: items.image }, { flagged: true }).then((result) => {
                if (result['acknowledged'] == true) {
                  console.log("flagged");
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
            else {
              console.log("not flagged");
            }

            if (items.classification == 'MRI') {
              mri.push(items.image)
              totalProcesses++ // add one to totalProcesses for each MRI image
            }

            else if (items.classification == 'XR') {
              xr.push(items.image)
              totalProcesses++ // add one to totalProcesses for each XR image
            }
          }
          if (mri.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8000/mri',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(mri)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                for (let item of body) {
                  mri3.push(item)
                  brain.push(item.image)
                }
                if (brain.length > 0) {
                  const options = {
                    uri: 'http://127.0.0.1:8004/OD',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(brain)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        if (parseFloat(item.confidence) < 0.86) {
                          Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                            if (result['acknowledged'] == true) {
                              console.log("flagged");
                            }
                          }).catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          })
                        }
                        else {
                          console.log("not flagged");
                        }
                        console.log(item['Bounding Box']);
                        if (brain.includes(item.image)) {
                          if (!detect.includes(item.image)) {
                            const imagePath = `${loc}result/${item.image}`;
                            detect.push(item.image)
                            mri4.push(item)
                            Images.findOneAndUpdate({ name: item.image }, {
                              object_detection: {
                                object_detected: item.Object_Detected,
                                confidence: item.confidence,
                                image_object_detection: imagePath,
                                bounding_box: item['Bounding Box']
                              }
                            }, { new: true }).then(updatedImage => {
                              console.log('Image updated successfully:', updatedImage);
                            })
                              .catch(error => {
                                console.error('Error updating image:', error);
                              })
                          }
                        }
                      }

                      for (let item of brain) {
                        if (!detect.includes(item)) {
                          Images.findOneAndUpdate({ name: item }, {
                            object_detection: {
                              object_detected: "Negative",
                              confidence: '1.00',
                              image_object_detection: null,
                            }
                          }, { new: true }).then(updatedImage => {
                            console.log('Image updated successfully:', updatedImage);
                          })
                            .catch(error => {
                              console.error('Error updating image:', error);
                            })
                        }
                      }

                      if (detect.length < brain.length) {
                        processesCompleted = processesCompleted + (brain.length - detect.length)
                      }

                      if (processesCompleted === totalProcesses) {
                        let promises = [];

                        for (let item of data) {
                          promises.push(updateImage(item));
                        }

                        Promise.all(promises)
                          .then((results) => {
                            let list = results.filter((result) => result !== null);
                            res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                          })
                          .catch((e) => {
                            console.log(e);
                            res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                          });

                        async function updateImage(item) {
                          try {
                            await Images.updateOne({ "name": item }, { "classified": true });
                            let result = await Images.findOne({ "name": item });
                            return { "id": result['_id'].toString(), "image": result['path'] };
                          } catch (e) {
                            console.log(e);
                            return null;
                          }
                        }

                      }
                      if (detect.length > 0) {
                        const options = {
                          uri: 'http://127.0.0.1:8005/segment',
                          method: 'GET',
                          json: true,
                          qs: {
                            strings: decodeURIComponent(detect)
                          }
                        };
                        request(options, (error, response, body) => {
                          if (!error && response.statusCode === 200) {
                            for (let item of body) {
                              mri5.push(item)
                              processesCompleted++
                              Images.findOneAndUpdate({ name: item.image }, {
                                segmentation: {
                                  segmented_image: `${loc}result/segmented_${item.image}`,
                                  contour_image: `${loc}result/segmented_with_contour_${item.image}`,
                                  contour_coords: item.contour_coords
                                }
                              }, { new: true }).then(updatedImage => {
                                console.log('Image updated successfully:', updatedImage);
                              })
                                .catch(error => {
                                  console.error('Error updating image:', error);
                                })
                            }
                            if (processesCompleted === totalProcesses) {
                              let promises = [];

                              for (let item of data) {
                                promises.push(updateImage(item));
                              }

                              Promise.all(promises)
                                .then((results) => {
                                  let list = results.filter((result) => result !== null);
                                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                                })
                                .catch((e) => {
                                  console.log(e);
                                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                                });

                              async function updateImage(item) {
                                try {
                                  await Images.updateOne({ "name": item }, { "classified": true });
                                  let result = await Images.findOne({ "name": item });
                                  return { "id": result['_id'].toString(), "image": result['path'] };
                                } catch (e) {
                                  console.log(e);
                                  return null;
                                }
                              }
                              /*const mergedList = [];
                              const imageMap = {};
                              [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                                list.forEach((item) => {
                                  const existingItems = imageMap[item.image] || [];
                                  existingItems.push(item);
                                  imageMap[item.image] = existingItems;
                                });
                              });
                              // Convert the map to an array of arrays
                              Object.values(imageMap).forEach((itemArray) => {
                                mergedList.push(itemArray);
                              });
                              // Output the merged list
                              console.log(mergedList);
                              res.send(mergedList)*/
                            }
                          }
                        });
                      }
                    }
                  });
                }
              }
            });
          }

          if (xr.length > 0) {
            const options = {
              uri: 'http://127.0.0.1:8003/xr',
              method: 'GET',
              json: true,
              qs: {
                strings: decodeURIComponent(xr)
              }
            };
            request(options, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                const options = {
                  uri: 'http://127.0.0.1:8004/OD',
                  method: 'GET',
                  json: true,
                  qs: {
                    strings: decodeURIComponent(xr)
                  }
                };
                request(options, (error, response, body) => {
                  if (!error && response.statusCode === 200) {
                    for (let item of body) {
                      if (parseFloat(item.confidence) < 0.86) {
                        Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                          if (result['acknowledged'] == true) {
                            console.log("flagged");
                          }
                        }).catch((e) => {
                          console.log(e);
                          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                        })
                      }
                      else {
                        console.log("not flagged");
                      }
                      if (xr.includes(item.image)) {
                        if (!detectX.includes(item.image)) {
                          const imagePath = `${loc}result/${item.image}`;
                          processesCompleted++
                          xr2.push(item)
                          Images.findOneAndUpdate({ name: item.image }, {
                            object_detection: {
                              object_detected: item.Object_Detected,
                              confidence: item.confidence,
                              image_object_detection: imagePath,
                              bounding_box: item['Bounding Box']
                            }
                          }, { new: true }).then(updatedImage => {
                            console.log('Image updated successfully:', updatedImage);
                          })
                            .catch(error => {
                              console.error('Error updating image:', error);
                            })
                        }
                        detectX.push(item.image)
                      }
                    }
                    for (let item of xr) {
                      if (!detectX.includes(item)) {
                        Images.findOneAndUpdate({ name: item }, {
                          object_detection: {
                            object_detected: "Negative",
                            confidence: '1.00',
                            image_object_detection: null,
                          }
                        }, { new: true }).then(updatedImage => {
                          console.log('Image updated successfully:', updatedImage);
                        })
                          .catch(error => {
                            console.error('Error updating image:', error);
                          })
                      }
                    }
                    if (detectX.length < xr.length) {
                      processesCompleted = processesCompleted + (xr.length - detectX.length)
                    }
                    if (processesCompleted === totalProcesses) {
                      let promises = [];

                      for (let item of data) {
                        promises.push(updateImage(item));
                      }

                      Promise.all(promises)
                        .then((results) => {
                          let list = results.filter((result) => result !== null);
                          res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                        })
                        .catch((e) => {
                          console.log(e);
                          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                        });

                      async function updateImage(item) {
                        try {
                          await Images.updateOne({ "name": item }, { "classified": true });
                          let result = await Images.findOne({ "name": item });
                          return { "id": result['_id'].toString(), "image": result['path'] };
                        } catch (e) {
                          console.log(e);
                          return null;
                        }
                      }
                      /*const mergedList = [];
                      const imageMap = {};
                      [images, mri1, mri2, mri3, mri4, mri5, xr1, xr2].forEach((list) => {
                        list.forEach((item) => {
                          const existingItems = imageMap[item.image] || [];
                          existingItems.push(item);
                          imageMap[item.image] = existingItems;
                        });
                      });
                      // Convert the map to an array of arrays
                      Object.values(imageMap).forEach((itemArray) => {
                        mergedList.push(itemArray);
                      });
                      // Output the merged list
                      console.log(mergedList);
                      res.send(mergedList)*/
                    }
                  }
                });

              }
            });
          }

          else {
            if (processesCompleted === totalProcesses) {
              let promises = [];

              for (let item of data) {
                promises.push(updateImage(item));
              }

              Promise.all(promises)
                .then((results) => {
                  let list = results.filter((result) => result !== null);
                  res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                })
                .catch((e) => {
                  console.log(e);
                  res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                });

              async function updateImage(item) {
                try {
                  await Images.updateOne({ "name": item }, { "classified": true });
                  let result = await Images.findOne({ "name": item });
                  return { "id": result['_id'].toString(), "image": result['path'] };
                } catch (e) {
                  console.log(e);
                  return null;
                }
              }
            }
          }
        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }
});

app.post('/xr', upload, async (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  if (!('files' in req) || req.files.length === 0) {
    console.log("Please enter images");
    res.send({ "status": "false", "message": 'Please enter images', "data": null });
  }
  else {
    try {
      const result = await User.findOne({ tokens: authHeader });
      if (!result) {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        return;
      }

      console.log(`Token found: ${result['tokens']}`);
      const data = [];
      const files = req.files;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentDate = new Date();
        const image = new Images({ "name": file.filename, "path": `${loc}${file.filename}`, "doctorID": [result['_id'].toString()], "patientID": null, "flagged": false, "classified": false, "approved": false, "date": currentDate });
        try {
          await image.save();
          console.log(image);
          data.push(file.filename);
        } catch (e) {
          console.log("failed:", e);
        }
      }

      // Send the POST request after a delay of 100 milliseconds
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });

      const detectX = []
      const xr1 = []
      const xr2 = []

      var processesCompleted = 0 // initialize counter to zero
      var totalProcesses = 0 // initialize totalProcesses to zero
      const options = {
        uri: 'http://127.0.0.1:8003/xr',
        method: 'GET',
        json: true,
        qs: {
          strings: decodeURIComponent(data)
        }
      };
      request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          for (let item of body) {
            if (parseFloat(item.confidence) < 0.86) {
              Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                if (result['acknowledged'] == true) {
                  console.log("flagged");
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
            else {
              console.log("not flagged");
            }
            xr1.push(item)
            totalProcesses++
            Images.findOne({ name: item.image }).then((doc) => {
              const newClassification = {
                classification: item.classification,
                confidence: item.confidence
              };
              doc.classification.push(newClassification);
              doc.save().then((updatedDoc) => {
                console.log(updatedDoc);
              }).catch((e) => {
                console.log(e);
              })
            }).catch((e) => {
              console.log(e);
            })
          }
          const options = {
            uri: 'http://127.0.0.1:8004/OD',
            method: 'GET',
            json: true,
            qs: {
              strings: decodeURIComponent(data)
            }
          };
          request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
              for (let item of body) {
                if (parseFloat(item.confidence) < 0.86) {
                  Images.updateOne({ name: item.image }, { flagged: true }).then((result) => {
                    if (result['acknowledged'] == true) {
                      console.log("flagged");
                    }
                  }).catch((e) => {
                    console.log(e);
                    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                  })
                }
                else {
                  console.log("not flagged");
                }
                if (data.includes(item.image)) {
                  if (!detectX.includes(item.image)) {
                    const imagePath = `${loc}result/${item.image}`;
                    processesCompleted++
                    xr2.push(item)
                    Images.findOneAndUpdate({ name: item.image }, {
                      object_detection: {
                        object_detected: item.Object_Detected,
                        confidence: item.confidence,
                        image_object_detection: imagePath,
                        bounding_box: item['Bounding Box']
                      }
                    }, { new: true }).then(updatedImage => {
                      console.log('Image updated successfully:', updatedImage);
                    })
                      .catch(error => {
                        console.error('Error updating image:', error);
                      })
                  }
                  detectX.push(item.image)
                }
              }

              for (let item of data) {
                if (!detectX.includes(item)) {
                  Images.findOneAndUpdate({ name: item }, {
                    object_detection: {
                      object_detected: "Negative",
                      confidence: '1.00',
                      image_object_detection: null,
                    }
                  }, { new: true }).then(updatedImage => {
                    console.log('Image updated successfully:', updatedImage);
                  })
                    .catch(error => {
                      console.error('Error updating image:', error);
                    })
                }
              }
              if (detectX.length < data.length) {
                processesCompleted = processesCompleted + (data.length - detectX.length)
              }
              if (processesCompleted === totalProcesses) {
                let promises = [];

                for (let item of data) {
                  promises.push(updateImage(item));
                }

                Promise.all(promises)
                  .then((results) => {
                    let list = results.filter((result) => result !== null);
                    res.send({ "status": "true", "message": 'Classified Images Successfully!', "data": list });
                  })
                  .catch((e) => {
                    console.log(e);
                    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
                  });

                async function updateImage(item) {
                  try {
                    await Images.updateOne({ "name": item }, { "classified": true });
                    let result = await Images.findOne({ "name": item });
                    return { "id": result['_id'].toString(), "image": result['path'] };
                  } catch (e) {
                    console.log(e);
                    return null;
                  }
                }
              }
            }
          });
        }
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    }
  }
});

app.post('/signup', (req, res) => {
  const { username, password, age, gender, userType, email, phone } = req.body;
  if (username === "" || !('username' in req.body || username === null)) {
    console.log("Please enter username");
    res.send({ "status": "false", "message": 'Please enter username', "data": null });
  }
  else if (age === "" || !('age' in req.body) || age === null) {
    console.log("Please enter age");
    res.send({ "status": "false", "message": 'Please enter age', "data": null });
  }
  else if (gender === "" || !('gender' in req.body) || gender === null) {
    console.log("Please enter gender");
    res.send({ "status": "false", "message": 'Please enter gender', "data": null });
  }
  else if (password === "" || !('password' in req.body) || password === null) {
    console.log("Please enter password");
    res.send({ "status": "false", "message": 'Please enter password', "data": null });
  }
  else if (userType === "" || !('userType' in req.body) || userType === null) {
    console.log("Please enter userType");
    res.send({ "status": "false", "message": 'Please enter userType', "data": null });
  }
  else if (userType.toLowerCase() !== 'doctor' && userType.toLowerCase() !== 'patient') {
    console.log("Please choose right userType");
    res.send({ "status": "false", "message": 'Please choose right userType', "data": null });
  }
  else if (email === "" || !('email' in req.body) || email === null) {
    console.log("Please enter email");
    res.send({ "status": "false", "message": 'Please enter email', "data": null });
  }
  else if (phone === "" || !('phone' in req.body || phone === null)) {
    console.log("Please enter phone");
    res.send({ "status": "false", "message": 'Please enter phone', "data": null });
  }
  else if (password.length < 7) {
    console.log("Password must be longer than 6 characters");
    res.send({ "status": "false", "message": 'Password must be longer than 6 characters', "data": null });
  }
  else {
    User.findOne({ username }).then((result) => {
      if (result) {
        res.send({ "status": "false", "message": "Username already in use", "data": null })
      }
      else {
        // Insert new user into database
        const user = new User({ username, password, age, gender, userType, email, phone })
        user.save().then(() => {
          res.send({ "status": "true", "message": 'Sign Up successfully!', "data": { 'username': user['username'], 'age': user['age'], 'gender': user['gender'], "userType": userType, 'email': user['email'], 'phone': user['phone'] } })
        }).catch((e) => {
          console.log(e);
          res.send({ "status": "false", "message": e, "data": null });
        })
      }

    }).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

});

app.post('/signout', (req, res) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);
  User.updateOne({ tokens: authHeader }, { $pull: { tokens: authHeader } }).then((result => {
    if (result['modifiedCount'] === 1) {
      console.log(result);
      res.send({ "status": "true", "message": 'Signed out successfully', "data": { "token": authHeader } })
    }
    else {
      console.log("Unauthorized")
      res.send({ "status": "false", "message": 'Unauthorized', "data": null })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })

});

app.post('/signin', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log(username)
  if (username === "" || !('username' in req.body)) {
    console.log("Please enter username");
    res.send({ "status": "false", "message": 'Please enter username', "data": null });
  }
  else if (password === "" || !('password' in req.body)) {
    console.log("Please enter password");
    res.send({ "status": "false", "message": 'Please enter gender', "data": null });
  }
  else {
    User.findOne({ username: username, password: password }).then((result) => {
      if (!result) {
        res.send({ "status": "false", "message": 'Username or password is wrong', "data": null });
      } else {
        const token = jwt.sign({ id: result['_id'] }, 'my_secret_key');
        User.findOne({ _id: result['_id'] }).then((doc) => {
          const newToken = token;
          doc.tokens.push(newToken);
          doc.save().then((updatedDoc) => {
            console.log(updatedDoc);
            res.send({ "status": "true", "message": 'Logged in successfully!', "data": { 'username': result['username'], 'id': result['_id'], 'age': result['age'], 'gender': result['gender'], "userType": result['userType'], "token": newToken } });
          }).catch((e) => {
            console.log(e);
          })
        }).catch((e) => {
          console.log(e);
        })
      }
    }).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }


});

app.put('/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  const age = req.body.age
  const gender = req.body.gender
  const username = req.body.username
  const email = req.body.email
  const phone = req.body.phone
  User.findOne({ tokens: authHeader }).then((result => {
    if (!result) {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
    else {
      User.findOne({ "username": username }).then((result1) => {
        if (!result1) {
          if (username === "" || !('username' in req.body)) {
            console.log("Please enter username");
            res.send({ "status": "false", "message": 'Please enter username', "data": null });
          }
          else if (age === "" || !('age' in req.body)) {
            console.log("Please enter age");
            res.send({ "status": "false", "message": 'Please enter age', "data": null });
          }
          else if (gender === "" || !('gender' in req.body)) {
            console.log("Please enter gender");
            res.send({ "status": "false", "message": 'Please enter gender', "data": null });
          }
          else if (email === "" || !('email' in req.body)) {
            console.log("Please enter email");
            res.send({ "status": "false", "message": 'Please enter email', "data": null });
          }
          else if (phone === "phone" || !('phone' in req.body)) {
            console.log("Please enter phone");
            res.send({ "status": "false", "message": 'Please enter phone', "data": null });
          }
          else {
            User.updateOne({ "tokens": authHeader }, { "username": username, "age": age, "gender": gender, "email": email, "phone": phone }).then((result2) => {
              if (result2['acknowledged'] == true) {
                res.send({ "status": "true", "message": 'Update completed successfully', "data": { "username": username, "age": age, "gender": gender, "email": email, "phone": phone, "token": authHeader } });
                console.log({ "status": "true", "message": 'Update completed successfully', "data": { "username": username, "age": age, "gender": gender, "email": email, "phone": phone, "token": authHeader } });
              }
              else {
                console.log("Failed to update");
                res.send({ "status": "false", "message": 'Failed to update', "data": null });
              }
            }).catch((e) => {
              console.log(e);
              res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
            })
          }
        }
        else {
          if (result1["_id"].toString() === result["_id"].toString()) {
            if (username === "" || !('username' in req.body)) {
              console.log("Please enter username");
              res.send({ "status": "false", "message": 'Please enter username', "data": null });
            }
            else if (age === "" || !('age' in req.body)) {
              console.log("Please enter age");
              res.send({ "status": "false", "message": 'Please enter age', "data": null });
            }
            else if (gender === "" || !('gender' in req.body)) {
              console.log("Please enter gender");
              res.send({ "status": "false", "message": 'Please enter gender', "data": null });
            }
            else if (email === "" || !('email' in req.body)) {
              console.log("Please enter email");
              res.send({ "status": "false", "message": 'Please enter email', "data": null });
            }
            else if (phone === "phone" || !('phone' in req.body)) {
              console.log("Please enter phone");
              res.send({ "status": "false", "message": 'Please enter phone', "data": null });
            }
            else {
              User.updateOne({ "tokens": authHeader }, { "username": username, "age": age, "gender": gender, "email": email, "phone": phone }).then((result2) => {
                if (result2['acknowledged'] === true) {
                  res.send({ "status": "true", "message": 'Update completed successfully', "data": { "username": username, "age": age, "gender": gender, "email": email, "phone": phone, "token": authHeader } });
                  console.log({ "status": "true", "message": 'Update completed successfully', "data": { "username": username, "age": age, "gender": gender, "email": email, "phone": phone, "token": authHeader } });
                }
                else {
                  console.log("Failed to update");
                  res.send({ "status": "false", "message": 'Failed to update', "data": null });
                }
              }).catch((e) => {
                console.log(e);
                res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
              })
            }
          }
          else {
            console.log('Username is already used');
            res.send({ "status": "false", "message": 'Username is already used', "data": null });
          }
        }
      })
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
})

app.get('/nonExistUsers', (req, res) => {
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (result && result['userType'] === 'admin') {
      Patient.find().then((result) => {
        if (!result) {
          console.log('Unauthorized');
          res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        }
        else {
          res.send({ "status": "true", "message": 'Get non-exist users table successfully', "data": result });
        }
      })
    }
    else {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
})

app.get('/users', (req, res) => {
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (result && result['userType'] === 'admin') {
      User.find().then((result) => {
        if (!result) {
          console.log('Unauthorized');
          res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        }
        else {
          res.send({ "status": "true", "message": 'Get users table successfully', "data": result });
        }
      })
    }
    else {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
})

app.get('/images', (req, res) => {
  const authHeader = req.headers['authorization'];
  User.findOne({ tokens: authHeader }).then((result => {
    if (result && result['userType'] === 'admin') {
      Images.find().then((result) => {
        if (!result) {
          console.log('Unauthorized');
          res.send({ "status": "false", "message": 'Unauthorized', "data": null });
        }
        else {
          res.send({ "status": "true", "message": 'Get images table successfully', "data": result });
        }
      })
    }
    else {
      console.log('Unauthorized');
      res.send({ "status": "false", "message": 'Unauthorized', "data": null });
    }
  })).catch((e) => {
    console.log(e);
    res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
  })
})

app.put('/editImages', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (result && result['userType'] === 'admin') {
        for (let item of req.body) {
          const { '_id': _id, classification, segmentation, diagnose, object_detection, date, approved, flagged, classified, doctorID, patientID, name, path } = item;
          if (_id === "" || !('_id' in item) || _id === null) {
            console.log("Please enter image ID");
            list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
          }
          else if (typeof _id !== 'number' && (_id.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(_id))) && (_id.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(_id)))) {
            list.push({ "imageID": _id, "status": 'false', "message": "Invalid image ID" })
          }
          else {
            let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(_id) }).then((result) => {
              if (result) {
                return Images.updateOne({ "_id": new mongoose.Types.ObjectId(_id) }, { classification, segmentation, diagnose, object_detection, date, approved, flagged, classified, doctorID, patientID, name, path }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": _id, "status": 'true', "message": "Edited Successfully" });
                    successCount++
                  } else {
                    list.push({ "imageID": _id, "status": 'false', "message": "Unable to edit item" })
                  }
                }).catch((error) => {
                  console.log(error);
                  list.push({ "imageID": _id, "status": 'false', "message": "Internal Server Error" })
                });
              }
              else {
                list.push({ "imageID": _id, "status": 'false', "message": "Wrong image ID" })
              }
            })
            promises.push(promise);
          }
        }

        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were edited successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})

app.delete('/deleteImages', (req, res) => {
  const authHeader = req.headers['authorization'];
  let promises = [];
  let list = []
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter imageID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((resul => {
      if (resul && resul['userType'] === 'admin') {
        for (let item of req.body) {
          const imageID = item.imageID
          if (imageID === "" || !('imageID' in item) || imageID === null) {
            list.push({ "imageID": null, "status": 'false', "message": "Image id cannot be equal null" })
          }
          else if (typeof imageID !== 'number' && (imageID.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(imageID))) && (imageID.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(imageID)))) {
            list.push({ "imageID": imageID, "status": 'false', "message": "Invalid image ID" })
          }
          else {
            let promise = Images.findOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
              if (result) {
                return Images.deleteOne({ "_id": new mongoose.Types.ObjectId(imageID) }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "imageID": imageID, "status": 'true', "message": "Done Successfully" });
                    successCount++
                  }
                  else {
                    list.push({ "imageID": imageID, "status": 'false', "message": "Unable to delete item" })
                  }
                }).catch((e) => {
                  console.log(e);
                  list.push({ "imageID": imageID, "status": 'false', "message": "Internal Server Error" })
                })
              }
              else {
                list.push({ "imageID": imageID, "status": 'false', "message": "Wrong image ID" })
              }
            })
            promises.push(promise)
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were deleted successfully, but others failed', "data": list });
          }
        }).catch((e) => {
          console.log(e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    }))
  }
})

app.post('/addImages', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter item', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (result && result['userType'] === 'admin') {
        for (let item of req.body) {
          const { _id, classification, segmentation, diagnose, object_detection, date, approved, flagged, classified, doctorID, patientID, name, path } = item;
          if (_id === "" || !('_id' in item) || _id === null) {
            const newItem = new Images({ classification, segmentation, diagnose, object_detection, date, approved, flagged, classified, doctorID, patientID, name, path })
            let promise = newItem.save().then((result) => {
              if (result) {
                list.push({ "imageID": result['_id'].toString(), "status": 'true', "message": "Added Successfully" });
                successCount++
              } else {
                list.push({ "imageID": result['_id'].toString(), "status": 'false', "message": "Unable to add item" })
              }
            }).catch((error) => {
              console.log(error);
              list.push({ "imageID": result['_id'].toString(), "status": 'false', "message": "Internal Server Error" })
            });
            promises.push(promise);
          }
          else {
            if (typeof _id !== 'number' && (_id.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(_id))) && (_id.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(_id)))) {
              list.push({ "imageID": _id, "status": 'false', "message": "Invalid image ID" })
            }
            else {
              let promise = Images.findOne({ '_id': _id }).then((result) => {
                if (result) {
                  return list.push({ "imageID": _id, "status": 'false', "message": "This ID is already used" })
                }
                else {
                  const newItem = new Images({ "_id": new mongoose.Types.ObjectId(_id), classification, segmentation, diagnose, object_detection, date, approved, flagged, classified, doctorID, patientID, name, path })
                  return newItem.save().then((result) => {
                    if (result) {
                      list.push({ "imageID": result['_id'].toString(), "status": 'true', "message": "Added Successfully" });
                      successCount++
                    } else {
                      list.push({ "imageID": _id, "status": 'false', "message": "Unable to add item" })
                    }
                  }).catch((error) => {
                    console.log(error);
                    list.push({ "imageID": _id, "status": 'false', "message": "Internal Server Error" })
                  });
                }
              })
              promises.push(promise);
            }
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were added successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})

app.put('/editUsers', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter userID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (result && result['userType'] === 'admin') {
        for (let item of req.body) {
          const { '_id': _id, username, age, password, gender, email, phone, userType, tokens } = item;
          if (_id === "" || !('_id' in item) || _id === null) {
            console.log("Please enter user ID");
            list.push({ "userID": null, "status": 'false', "message": "User id cannot be equal null" })
          }
          else if (typeof _id !== 'number' && (_id.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(_id))) && (_id.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(_id)))) {
            list.push({ "userID": _id, "status": 'false', "message": "Invalid user ID" })
          }
          else {
            let promise = User.findOne({ "_id": new mongoose.Types.ObjectId(_id) }).then((result) => {
              if (result) {
                return User.updateOne({ "_id": new mongoose.Types.ObjectId(_id) }, { username, age, password, gender, email, phone, userType, tokens }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "userID": _id, "status": 'true', "message": "Edited Successfully" });
                    successCount++
                  } else {
                    list.push({ "userID": _id, "status": 'false', "message": "Unable to edit user" })
                  }
                }).catch((error) => {
                  console.log(error);
                  list.push({ "userID": _id, "status": 'false', "message": "Internal Server Error" })
                });
              }
              else {
                list.push({ "userID": _id, "status": 'false', "message": "Wrong user ID" })
              }
            })
            promises.push(promise);
          }
        }

        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were edited successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }
})

app.delete('/deleteUsers', (req, res) => {
  const authHeader = req.headers['authorization'];
  let promises = [];
  let list = []
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter userID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((resul => {
      if (resul && resul['userType'] === 'admin') {
        for (let item of req.body) {
          const userID = item.userID
          if (userID === "" || !('userID' in item) || userID === null) {
            list.push({ "userID": null, "status": 'false', "message": "User id cannot be equal null" })
          }
          else if (typeof userID !== 'number' && (userID.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(userID))) && (userID.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(userID)))) {
            list.push({ "userID": userID, "status": 'false', "message": "Invalid user ID" })
          }
          else {
            let promise = User.findOne({ "_id": new mongoose.Types.ObjectId(userID) }).then((result) => {
              if (result) {
                return User.deleteOne({ "_id": new mongoose.Types.ObjectId(userID) }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "userID": userID, "status": 'true', "message": "Done Successfully" });
                    successCount++
                  }
                  else {
                    list.push({ "userID": userID, "status": 'false', "message": "Unable to delete user" })
                  }
                }).catch((e) => {
                  console.log(e);
                  list.push({ "userID": userID, "status": 'false', "message": "Internal Server Error" })
                })
              }
              else {
                list.push({ "userID": userID, "status": 'false', "message": "Wrong user ID" })
              }
            })
            promises.push(promise)
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were deleted successfully, but others failed', "data": list });
          }
        }).catch((e) => {
          console.log(e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    }))
  }
})

app.post('/addUsers', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter user information', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (result && result['userType'] === 'admin') {
        for (let item of req.body) {
          const { _id, username, age, password, gender, email, phone, userType, tokens } = item;
          if (_id === "" || !('_id' in item) || _id === null) {
            const newItem = new User({ username, age, password, gender, email, phone, userType, tokens })
            let promise = newItem.save().then((result) => {
              if (result) {
                list.push({ "userID": result['_id'].toString(), "status": 'true', "message": "Added Successfully" });
                successCount++
              } else {
                list.push({ "userID": result['_id'].toString(), "status": 'false', "message": "Unable to add user" })
              }
            }).catch((error) => {
              console.log(error);
              list.push({ "userID": result['_id'].toString(), "status": 'false', "message": "Internal Server Error" })
            });
            promises.push(promise);
          }
          else {
            if (typeof _id !== 'number' && (_id.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(_id))) && (_id.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(_id)))) {
              list.push({ "userID": _id, "status": 'false', "message": "Invalid user ID" })
            }
            else {
              let promise = User.findOne({ '_id': _id }).then((result) => {
                if (result) {
                  return list.push({ "userID": _id, "status": 'false', "message": "This ID is already used" })
                }
                else {
                  const newItem = new User({ "_id": new mongoose.Types.ObjectId(_id), username, age, password, gender, email, phone, userType, tokens })
                  return newItem.save().then((result) => {
                    if (result) {
                      list.push({ "userID": result['_id'].toString(), "status": 'true', "message": "Added Successfully" });
                      successCount++
                    } else {
                      list.push({ "userID": _id, "status": 'false', "message": "Unable to add user" })
                    }
                  }).catch((error) => {
                    console.log(error);
                    list.push({ "userID": _id.toString(), "status": 'false', "message": "Internal Server Error" })
                  });
                }
              })
              promises.push(promise);
            }
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were added successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})

app.put('/editNonExistUsers', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter userID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (result && result['userType'] === 'admin') {
        for (let item of req.body) {
          const { '_id': _id, name, age, gender, email, phone } = item;
          if (_id === "" || !('_id' in item) || _id === null) {
            console.log("Please enter user ID");
            list.push({ "userID": null, "status": 'false', "message": "User id cannot be equal null" })
          }
          else if (typeof _id !== 'number' && (_id.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(_id))) && (_id.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(_id)))) {
            list.push({ "userID": _id, "status": 'false', "message": "Invalid user ID" })
          }
          else {
            let promise = Patient.findOne({ "_id": new mongoose.Types.ObjectId(_id) }).then((result) => {
              if (result) {
                return Patient.updateOne({ "_id": new mongoose.Types.ObjectId(_id) }, { name, age, gender, email, phone }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "userID": _id, "status": 'true', "message": "Edited Successfully" });
                    successCount++
                  } else {
                    list.push({ "userID": _id, "status": 'false', "message": "Unable to edit user" })
                  }
                }).catch((error) => {
                  console.log(error);
                  list.push({ "userID": _id, "status": 'false', "message": "Internal Server Error" })
                });
              }
              else {
                list.push({ "userID": _id, "status": 'false', "message": "Wrong user ID" })
              }
            })
            promises.push(promise);
          }
        }

        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were edited successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})

app.delete('/deleteNonExistUsers', (req, res) => {
  const authHeader = req.headers['authorization'];
  let promises = [];
  let list = []
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter userID', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((resul => {
      if (resul && resul['userType'] === 'admin') {
        for (let item of req.body) {
          const userID = item.userID
          if (userID === "" || !('userID' in item) || userID === null) {
            list.push({ "userID": null, "status": 'false', "message": "User id cannot be equal null" })
          }
          else if (typeof userID !== 'number' && (userID.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(userID))) && (userID.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(userID)))) {
            list.push({ "userID": userID, "status": 'false', "message": "Invalid user ID" })
          }
          else {
            let promise = Patient.findOne({ "_id": new mongoose.Types.ObjectId(userID) }).then((result) => {
              if (result) {
                return Patient.deleteOne({ "_id": new mongoose.Types.ObjectId(userID) }).then((result) => {
                  if (result['acknowledged'] === true) {
                    list.push({ "userID": userID, "status": 'true', "message": "Done Successfully" });
                    successCount++
                  }
                  else {
                    list.push({ "userID": userID, "status": 'false', "message": "Unable to delete user" })
                  }
                }).catch((e) => {
                  console.log(e);
                  list.push({ "userID": userID, "status": 'false', "message": "Internal Server Error" })
                })
              }
              else {
                list.push({ "userID": userID, "status": 'false', "message": "Wrong user ID" })
              }
            })
            promises.push(promise)
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were deleted successfully, but others failed', "data": list });
          }
        }).catch((e) => {
          console.log(e);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    }))
  }
})

app.post('/addNonExistUsers', (req, res) => {
  let list = []
  const authHeader = req.headers['authorization'];
  let promises = [];
  let successCount = 0
  if (Object.keys(req.body).length === 0) {
    console.log('req.body is empty');
    res.send({ "status": "false", "message": 'please enter user', "data": null })
  } else {
    User.findOne({ tokens: authHeader }).then((result => {
      if (result && result['userType'] === 'admin') {
        for (let item of req.body) {
          const { _id, name, age, gender, email, phone } = item;
          if (_id === "" || !('_id' in item) || _id === null) {
            const newItem = new Patient({ name, age, gender, email, phone })
            let promise = newItem.save().then((result) => {
              if (result) {
                list.push({ "userID": result['_id'].toString(), "status": 'true', "message": "Added Successfully" });
                successCount++
              } else {
                list.push({ "userID": result['_id'].toString(), "status": 'false', "message": "Unable to add user" })
              }
            }).catch((error) => {
              console.log(error);
              list.push({ "userID": result['_id'].toString(), "status": 'false', "message": "Internal Server Error" })
            });
            promises.push(promise);
          }
          else {
            if (typeof _id !== 'number' && (_id.length !== 12 && !(/^[0-9a-fA-F]{12}$/.test(_id))) && (_id.length !== 24 && !(/^[0-9a-fA-F]{24}$/.test(_id)))) {
              list.push({ "userID": _id, "status": 'false', "message": "Invalid user ID" })
            }
            else {
              let promise = Patient.findOne({ '_id': _id }).then((result) => {
                if (result) {
                  return list.push({ "userID": _id, "status": 'false', "message": "This ID is already used" })
                }
                else {
                  const newItem = new Patient({ "_id": new mongoose.Types.ObjectId(_id), name, age, gender, email, phone })
                  return newItem.save().then((result) => {
                    if (result) {
                      list.push({ "userID": result['_id'].toString(), "status": 'true', "message": "Added Successfully" });
                      successCount++
                    } else {
                      list.push({ "userID": _id, "status": 'false', "message": "Unable to add user" })
                    }
                  }).catch((error) => {
                    console.log(error);
                    list.push({ "userID": _id.toString(), "status": 'false', "message": "Internal Server Error" })
                  });
                }
              })
              promises.push(promise);
            }
          }
        }
        Promise.all(promises).then(() => {
          if (successCount === req.body.length) {
            res.send({ "status": "true", "message": 'Done Successfully', "data": list });
          } else if (successCount === 0) {
            res.send({ "status": "false", "message": 'Failed', "data": list });
          } else {
            res.send({ "status": "true", "message": 'Some items were added successfully, but others failed', "data": list });
          }
        }).catch((error) => {
          console.log(error);
          res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
        });
      }
      else {
        console.log('Unauthorized');
        res.send({ "status": "false", "message": 'Unauthorized', "data": null });
      }
    })).catch((e) => {
      console.log(e);
      res.status(500).send({ "status": "false", "message": 'Internal Server Error', "data": null });
    })
  }

})



app.get('/specificScreen', (req, res) => {
  res.sendFile(__dirname + '/specific.html');
});




app.listen(port, () => {
  console.log('server up on port', port)
})

