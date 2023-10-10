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
const { log } = require('console');
const { MongoClient, ObjectID } = require('mongodb');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const request = require('postman-request')


const port = 8080

app.use(express.json());
app.use(bodyParser.json());

const dbName = 'taks-manager-api'
const url = 'mongodb://127.0.0.1:27017';

process.env.PYTHON = "C:\Users\oem\AppData\Local\Programs\Python\Python311\python.exe";
process.stdout.write('Starting Python script...\n');



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
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
}).array('image', 10);

// Handle the POST request to upload the file
app.post('/upload', upload, (req, res) => {
  data = []
  const files = req.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const image = new Images({ "name": file.filename, "path": file.path })
    image.save().then(() => {
      console.log(image);
      data.push(file.filename)
    }).catch((e) => {
      console.log("failed:", e);
    })
    // ...rest of the code to save the file
  }


  res.send('Image uploaded successfully');
  setTimeout(() => {
    const options = {
      uri: 'http://localhost:8080/result',
      method: 'POST',
      json: true,
      qs: {
        strings: decodeURIComponent(data)
      }
    };
    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
      }
    });
  }, 1000);
  
  /*setTimeout(() => {
    fetch('http://localhost:8080/result', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify(data)
    })
  }, 1000);*/



});

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


var classify = null
var classifyXR = null
var classifyMRI = null
var kneeMRI = null
var classifyMriHead = null
var od = null

classify = spawn('python', ["Classification_General\\General_API.py", '8001']);

classify.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

classify.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

classify.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});
classifyMRI = spawn('python', ["Classification_MRI\\MRI_API.py"]);

classifyMRI.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

classifyMRI.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

classifyMRI.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});
kneeMRI = spawn('python', ["Classification_MRI_Knee\\MRI_Knee_API.py"]);

kneeMRI.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

kneeMRI.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

kneeMRI.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});
classifyMriHead = spawn('python', ["Segmentation_MRI\\MRI_Seg_API.py", '8005']);

classifyMriHead.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

classifyMriHead.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

classifyMriHead.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});

od = spawn('python', ["Object_Detection\\OD_API.py", '8004']);

od.stdout.on('data', (data) => {
  process.stdout.write(`stdout: ${data}`);
});

od.stderr.on('data', (data) => {
  process.stderr.write(`stderr: ${data}`);
});

od.on('close', (code) => {
  process.stdout.write(`child process exited with code ${code}\n`);
});

app.post('/result', (req, res) => {
  const data = req.query.strings.split(',');

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
    const xr = []
    const xr1 = []
    const xr2 = []
    const sonar = []
    if (!error && response.statusCode === 200) {
      for (let items of body) {
        images.push(items)
        if (items.classification == 'MRI') {
          mri.push(items.image)
        }
        else if (items.classification == 'XR') {
          xr.push(items.image)
        }
        else if (items.classification == 'Sonar') {
          sonar.push(items.image)
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
                    mri2.push(itemsss)
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
                    if (brain.includes(item.image)) {
                      mri4.push(item)
                      console.log(item)
                    }
                  }
                  const options = {
                    uri: 'http://127.0.0.1:8005/segment',
                    method: 'GET',
                    json: true,
                    qs: {
                      strings: decodeURIComponent(brain)
                    }
                  };
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                      for (let item of body) {
                        mri5.push(item)
                      }
                    }
                  });
                }
              });
            }
          }
        });
      }
      setTimeout(() => {
        const mergedList = [];
        const imageMap = {};
        [images, mri1, mri2, mri3, mri4, mri5].forEach((list) => {
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
        res.send(mergedList)
      }, 23000);
    }
  });
})

app.post('/seg', (req, res) => {
  var classify = null
  //var items = []
  classify = spawn('python', ["Segmentation_MRI\\MRI_Seg_API.py", '8000']);

  classify.stdout.on('data', (data) => {
    process.stdout.write(`stdout: ${data}`);
  });

  classify.stderr.on('data', (data) => {
    process.stderr.write(`stderr: ${data}`);
  });

  classify.on('close', (code) => {
    process.stdout.write(`child process exited with code ${code}\n`);
  });

  setTimeout(() => {
    fetch('http://127.0.0.1:8000/segment')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        for (let item of data) {
          //items.push(item)
          console.log(item)
        }
        /*setTimeout(() => {
          res.send(JSON.stringify(items))
        }, 10000);*/
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, 7000);
});


/*app.get('/result', (req, res) => {
  const list1 = []
  const list2 = []
  const list3 = []
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

  setTimeout(() => {
    fetch('http://127.0.0.1:8001/classify').then((response) => {
      response.json().then((data) => {
        for (let items of data) {
          list1.push(items)
          console.log(items);
          if (items.classification == 'MRI') {
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
            classifyMRI.stdin.write(items.image);
            classifyMRI.stdin.end();
            setTimeout(() => {
              fetch('http://127.0.0.1:8000/mri').then((response) => {
                response.json().then((data) => {
                  for (let item of data) {
                    if (item.classification == 'Knee') {
                      console.log(item);
                      list2.push(item)
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
                      kneeMRI.stdin.write(item.image);
                      kneeMRI.stdin.end();
                      setTimeout(() => {
                        fetch('http://127.0.0.1:8002/knee').then((response) => {
                          response.json().then((data) => {
                            for (let itemsss of data) {
                              list3.push(itemsss)
                              console.log(itemsss)
                            }
                            const mergedList = [];
                            const imageMap = {};

                            [list1, list2, list3].forEach((list) => {
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
                            //console.log(mergedList);
                            //res.send(mergedList)
                            classifyMRI.kill();
                            classify.kill();
                            kneeMRI.kill();
                          })
                        })
                      }, 3000);

                    }
                    else if (item.classification == 'Brain') {
                      //console.log(item);
                      list2.push(item)

                      const mergedList = [];
                      const imageMap = {};

                      [list1, list2, list3].forEach((list) => {
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
                      res.send(mergedList)
                    }
                  }
                }
                )
              })
            }, 3000);
          }

          else if (items.classification == 'XR') {
            //console.log(items);
            classifyXR.stdin.write(items.image);
            classifyXR.stdin.end();
            fetch('http://127.0.0.1:8003/xr').then((response) => {
              response.json().then((data) => {
                for (let item of data) {
                  //console.log(item);
                  list2.push(item)
                  const mergedList = [];
                  const imageMap = {};

                  [list1, list2, list3].forEach((list) => {
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
                  res.send(mergedList)
                }
              })
            })
          }

          else {
            const mergedList = [];
            const imageMap = {};

            [list1, list2, list3].forEach((list) => {
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
            //console.log(mergedList);
            //res.send(mergedList)
          }
        }
      })
    })
  }, 3000);

})
*/



app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
});


app.post('/submit', (req, res) => {
  const { username, password, age, gender } = req.body;

  User.findOne({ username }).then((result) => {
    if (result) {
      console.log('Username already in use');
      res.status(400).send('Username already in use');
    } else {
      // Insert new user into database
      const user = new User({ username, password, age, gender })
      user.save().then(() => {
        console.log("User Registered Successfully");
        res.send(user)
      }).catch((e) => {
        res.status(400).send(e)
      })
    }
  }).catch((e) => {
    console.log(e);
  });

});

app.get('/users/:userId', (req, res) => {
  const _id = req.params.userId;
  User.findOne({ _id }).then((result) => {
    res.send(result)
  }).catch((e) => {
    res.status(400).send(e)
  })
});


app.listen(port, () => {
  console.log('server up on port', port)
})

