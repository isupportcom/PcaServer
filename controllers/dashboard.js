const { default: axios } = require("axios");
const database = require("../database");

exports.getAllPosts = (req, res, next) => {
  database
    .execute("SELECT * FROM post")
    .then(async (posts) => {
      let returnposts = [];
      for (let i = 0; i < posts[0].length; i++) {
        returnposts[i] = {
          post: posts[0][i].post,
          username: posts[0][i].username,
          password: posts[0][i].password,
          actions: await this.getActions(posts[0][i].actions),
        };
      }
      res.status(200).json({ message: "All Posts", posts: returnposts });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.addPosts = (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  const actions = req.body.actions;

  if (!username || !password || !actions) {
    res.status(402).json({ message: "Fill The Required Fields" });
  } else {
    database
      .execute(
        "INSERT INTO post (post,username,password,actions) VALUES (NULL,?,?,?)",
        [username, password, actions.join(",")]
      )
      .then((inserted) => {
        this.getAllPosts(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.updatePosts = async (req, res, next) => {
  const posts = req.body.posts;

  if (!posts) {
    res.status(402).json({ message: "fill the required fields" });
  } else {
    // Ελεγχος για το μηκος του πινακα
    // αν ειναι μηδεν δε χρειαζεται να γραψει στην βαση
    // αλλιως κανει λουπα σε καθε ενα στοιχειο του πινακα και ανανεωνει την βαση.
    if (posts.length > 0) {
      for (let i = 0; i < posts.length; i++) {
        try {
          let update = await database.execute(
            "update post set username=?,password=?,actions=? where post=?",
            [
              posts[i].username,
              posts[i].password,
              this.joinedActions(posts[i].actions),
              posts[i].post,
            ]
          );
        } catch (err) {
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        }
      }
      this.getAllPosts(req, res, next);
    } else {
      res.status(200).json({ message: "Everything Up to Date" });
    }
  }
};

exports.getAllActions = (req, res, next) => {
  database
    .execute("SELECT * FROM actions")
    .then(async (actions) => {
      let returnactions = [];
      for (let i = 0; i < actions[0].length; i++) {
        returnactions[i] = {
          actions: actions[0][i].actions,
          name: actions[0][i].name,
        };
      }
      res.status(200).json({ message: "All Actions", actions: returnactions });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.addActions = (req, res, next) => {
  const name = req.body.name;

  if (!name) {
    res.status(402).json({ message: "Fill The Required Fields" });
  } else {
    database.execute("INSERT INTO actions (actions,name) VALUES (NULL,?)", [
      name,
    ]);
  }
  this.getAllActions(req, res, next);
};

exports.deletePost = (req, res, next) => {
  const postId = req.body.post;

  if (!postId) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("delete from post where post=?", [postId])
      .then((deleteRes) => {
        this.getAllPosts(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.updateActions = async (req, res, next) => {
  const actions = req.body.actions;

  if (!actions) res.status(402).json({ message: "fill the required fields" });
  else {
    // ελεγχος για το μηκος του πινακα για να μην κανει περιττους ελεγχους
    if (actions.length > 0) {
      for (let i = 0; i < actions.length; i++) {
        try {
          let update = await database.execute(
            "update actions set name=? where actions=?",
            [actions[i].name, actions[i].actions]
          );
        } catch (err) {
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        }
      }
      this.getAllActions(req, res, next);
    } else {
      res.status(200).json({ message: "Ulready Up to Date" });
    }
  }
};

exports.deleteAction = (req, res, next) => {
  const actionID = req.body.action;

  if (!actionID) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("delete from actions where actions=?", [actionID])
      .then((deleteRes) => {
        this.getAllActions(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

//function που χρησιμοποιώ εσωτερικά
//Μετατροπή του πίνακα actions απο [1,2,3] σε πίνακα με τις ονομασίες τους [action1,action2,action3]
exports.getActions = async (action) => {
  let actionsObj = [];
  let actions = this.fromStringToArray(action);
  for (let i = 0; i < actions.length; i++) {
    let sActions = await database.execute(
      "select * from actions where actions =?",
      [actions[i]]
    );

    actionsObj[i] = {
      actions: sActions[0][0].actions,
      name: sActions[0][0].name,
    };
  }
  return actionsObj;
};

//Για μετατροπή απο string id (πχ 1,2,3) σε πίνακα [1,2,3]
exports.fromStringToArray = (string) => {
  let arr = string.split(",");
  return arr;
};

//function για να παρει τα actions και απο πινακα απο οbjects να παρει το πεδιο actions και να τα κανει join με ,
exports.joinedActions = (actions) => {
  let tempArr = [];
  for (let i = 0; i < actions.length; i++) {
    tempArr[i] = actions[i].actions;
  }

  return tempArr.join(",");
};
