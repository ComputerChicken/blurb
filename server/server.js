import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors"
import multer from "multer";

import chalk from "chalk";

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 80;

app.use(cors());

app.use(express.static("public"));

function arraysEqual(a, b) {
  return a.length === b.length &&
         a.every((val, i) => val === b[i])
}

async function addChat(message) {
    fs.readFile("chat"+message.chatid+".json", "utf8", (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        const jsonData = JSON.parse(data);

        const dataToAdd = {
            user: message.username,
            chat: message.message
        }

        jsonData.contents.push(dataToAdd);

        const updatedJsonString = JSON.stringify(jsonData, null, 2);

        fs.writeFile("chat"+message.chatid+".json", updatedJsonString, "utf8", (err, data) => {});

        console.log(chalk.blue(chalk.bold('Data successfully added to the JSON file!')));
    });
}

function createUser(username, password, displayname, rs) {
    const data = fs.readFileSync("users.json", "utf8")

    const jsonData = JSON.parse(data);

    const dataToAdd = {
        displayname: displayname,
        password: password,
        friends: [],
        requests: [],
        rs: rs
    };

    if(Object.keys(jsonData).includes(username)) {
        return "Username already in use!";
    }

    jsonData[username] = {};
    jsonData[username] = dataToAdd;

    const updatedJsonString = JSON.stringify(jsonData, null, 2);

    fs.writeFileSync("users.json", updatedJsonString, "utf8");

    console.log(chalk.blue(chalk.bold('Data successfully added to the JSON file!')));

    return true;
}

function updateUser(username, param, val) {
    const data = fs.readFileSync("users.json", "utf8")

    const jsonData = JSON.parse(data);

    jsonData[username][param] = val;

    const updatedJsonString = JSON.stringify(jsonData, null, 2);

    fs.writeFileSync("users.json", updatedJsonString, "utf8");

    console.log(chalk.blue(chalk.bold('Data successfully added to the JSON file!')));

    return true;
}

function sendRequest(requester, target) {
    const data = fs.readFileSync("users.json", "utf8")

    const jsonData = JSON.parse(data);

    jsonData[target].requests.push(requester);

    const updatedJsonString = JSON.stringify(jsonData, null, 2);

    fs.writeFileSync("users.json", updatedJsonString, "utf8");

    console.log(chalk.blue(chalk.bold('Data successfully added to the JSON file!')));

    return true;
}

function acceptRequest(requester, target) {
    const data = fs.readFileSync("users.json", "utf8")

    const jsonData = JSON.parse(data);

    jsonData[target].requests = jsonData[target].requests.filter(function (item) {
        return item !== requester;
    });

    jsonData[requester].friends.push(target);
    jsonData[target].friends.push(requester);

    const updatedJsonString = JSON.stringify(jsonData, null, 2);

    fs.writeFileSync("users.json", updatedJsonString, "utf8");

    var chatName = {}

    chatName[requester] = jsonData[target].displayname;
    chatName[target] = jsonData[requester].displayname;

    fs.writeFileSync("chat" + Math.round(Math.random()*100000) + ".json", JSON.stringify({
        "name": chatName,
        "chatters": [
            target,
            requester
        ],
        contents: []
    }), "utf8");

    console.log(chalk.blue(chalk.bold('Data successfully added to the JSON file!')));

    return true;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    if(req.body.username) {
        fs.readdir("./uploads", (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                return;
            }
            for(const fileName of files) {
                if(fileName.split(".")[0] == req.body.username && fileName != req.body.username + path.extname(file.originalname)) {
                    fs.unlink("./uploads/"+fileName, (err) => {
                        if (err) {
                            console.error('An error occurred:', err);
                        } else {
                            console.log('File deleted successfully!');
                        }
                    });
                }
            };
        });
        console.log("Uploading story for user " + req.body.username);
        cb(null, req.body.username + path.extname(file.originalname));
    } else {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
  }
});

const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    message: "File uploaded successfully",
    file: req.file
  });
});

const pfpStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "pfps/");
  },
  filename: (req, file, cb) => {
    console.log("Uploading pfp for user " + req.body.username);
    cb(null, req.body.username + path.extname(file.originalname));
  }
});

const pfpUpload = multer({ storage: pfpStorage });

app.post("/pfp-upload", pfpUpload.single("file"), (req, res) => {
    console.log(req.body)
    console.log(req.file)
    res.json({
        message: "File uploaded successfully",
        file: req.file
    });
});

const pfpsPath = path.join(__dirname, "pfps");
const uploadsPath = path.join(__dirname, "uploads");

app.use("/pfps", express.static(pfpsPath));
app.use("/uploads", express.static(uploadsPath));

app.use(express.json());

// POST endpoint
app.post("/send-message", (req, res) => {
    const message = req.body;
    console.log("Incoming message " + chalk.blue(chalk.bold(JSON.stringify(message))));
    addChat(message);
    res.send(null);
});

// POST endpoint
app.post("/send-request", (req, res) => {
    const request = req.body;
    console.log("Incoming friend request " + chalk.blue(chalk.bold(JSON.stringify(request))));
    sendRequest(request.requester, request.target);
    res.send(null);
});

// POST endpoint
app.post("/accept-request", (req, res) => {
    const request = req.body;
    console.log("Accepting friend request " + chalk.blue(chalk.bold(JSON.stringify(request))));
    acceptRequest(request.requester, request.target);
    res.send(null);
});

// POST endpoint
app.post("/create-user", async (req, res) => {
    const userData = req.body;
    console.log("Create user request " + chalk.blue(chalk.bold(JSON.stringify(userData))));
    const returnText = createUser(userData.username, userData.password, userData.displayname, userData.rs);
    res.send(
        returnText
    );
    console.log("Returning " + chalk.blue(chalk.bold(returnText)))
});

// POST endpoint
app.post("/update-user", async (req, res) => {
    const userData = req.body;
    console.log("Update user request " + chalk.blue(chalk.bold(JSON.stringify(userData))));
    const returnText = updateUser(userData.username, userData.param, userData.val);
    res.send(
        returnText
    );
    console.log("Returning " + chalk.blue(chalk.bold(returnText)))
});

// POST endpoint
app.post("/auth", (req, res) => {
    // Incoming info from query params
    const authData = req.body;

    console.log("Resquest to authenticate user with username " + chalk.green(chalk.bold(authData.username)));

    const filePath = path.join(__dirname, "users.json");

    // Process the incoming data
    fs.readFile(filePath, "utf8", (err, jsonData) => {
        if (err) {
            return res.status(500).json({ error: "Could not read file"});
        }

        const data = JSON.parse(jsonData);
        if(!data[authData.username]) {
            res.send("Invalid username");
            return;
        }
        if(data[authData.username].password == authData.password) {
            res.send("true");
        } else {
            res.send("Password incorrect");
        }
    });
});

// GET endpoint
app.get("/get-all-users", (req, res) => {
    console.log("Resquest to get all users");

    const data = fs.readFileSync("users.json", "utf8")

    const jsonData = JSON.parse(data);

    res.json(Object.keys(jsonData));
});

// GET endpoint
app.get("/get-pfp-path", (req, res) => {
    // Incoming info from query params
    const { username } = req.query;

    console.log("Resquest to get user pfp with username " + chalk.green(chalk.bold(username)));

    var sent = false;

    // Process the incoming data
    fs.readdir("./pfps", (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        for(const file of files) {
            if(file.split(".")[0] == username) {
                res.send(file);
                sent = true;
            }
        };
        if(!sent) {
            res.send("default.jpg");
        }
    });
});

// GET endpoint
app.get("/get-story-path", (req, res) => {
    // Incoming info from query params
    const { username } = req.query;

    console.log("Resquest to get user story with username " + chalk.green(chalk.bold(username)));

    var sent = false;

    // Process the incoming data
    fs.readdir("./uploads", (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        for(const file of files) {
            if(file.split(".")[0] == username) {
                res.send(file);
                sent = true;
            }
        };
        if(!sent) {
            res.send("none");
        }
    });
});

// GET endpoint
app.get("/get-mutuals", (req, res) => {
    // Incoming info from query params
    const { user1, user2 } = req.query;

    console.log("Resquest to get mutual users from users " + chalk.green(chalk.bold(user1)) + ", " + chalk.green(chalk.bold(user2)));

    // Process the incoming data
    const filePath = path.join(__dirname, "users.json");

    // Process the incoming data
    fs.readFile(filePath, "utf8", (err, jsonData) => {
        if (err) {
            return res.status(500).json({ error: "Could not read file"});
        }

        const data = JSON.parse(jsonData);

        var filteredArray = data[user1].friends.filter(function(n) {
            return data[user2].friends.indexOf(n) !== -1;
        });

        res.send(filteredArray.length);
    });
});

// GET endpoint
app.get("/get-user-data", (req, res) => {
    // Incoming info from query params
    const { user } = req.query;

    console.log("Resquest to get user data with username " + chalk.green(chalk.bold(user)));

    const filePath = path.join(__dirname, "users.json");

    // Process the incoming data
    fs.readFile(filePath, "utf8", (err, jsonData) => {
        if (err) {
            return res.status(500).json({ error: "Could not read file"});
        }

        const data = JSON.parse(jsonData);
        res.json(data[user]);
    });
});

// GET endpoint
app.get("/get-chat-data", (req, res) => {
    // Incoming info from query params
    const { chatid } = req.query;

    console.log("Resquest to get chat contents with id " + chalk.green(chalk.bold(chatid)));

    const filePath = path.join(__dirname, "chat" + chatid + ".json");

    // Process the incoming data
    fs.readFile(filePath, "utf8", (err, jsonData) => {
        if (err) {
            return res.status(500).json({ error: "Could not read file"});
        }

        const data = JSON.parse(jsonData);
        res.json(data);
    });
});

// GET endpoint
app.get("/get-chat-id", (req, res) => {
    // Incoming info from query params
    var { users } = req.query;

    users = users.split(",").sort();

    console.log("Resquest to get chat id of users " + chalk.green(chalk.bold(users)));

    let sent = false;

    // Process the incoming data
    fs.readdir("./", (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        files.forEach(filePath => {
            if(filePath.includes("chat")) {
                fs.readFile(filePath, "utf8", (err, jsonData) => {
                    if (err) {
                        return res.status(500).json({ error: "Could not read file" });
                    }

                    const data = JSON.parse(jsonData);
                    const chatters = data.chatters.sort();

                    if(arraysEqual(chatters,users)) {
                        if(!sent) {
                            res.json(filePath.slice(4,-5));
                            sent = true;
                        }
                    }
                });
            }
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(chalk.blue(chalk.bold(`Server running on http://localhost:${PORT}`)));
});