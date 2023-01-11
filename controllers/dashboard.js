const { default: axios } = require("axios");
const database = require("../database");
const generator = require("generate-password");
const decoder = new TextDecoder("ISO-8859-7");
/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                               Ποστα                                        *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

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
          actions: await this.getActions(posts[0][i].post),
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
      .execute("INSERT INTO post (post,username,password) VALUES (NULL,?,?)", [
        username,
        password,
      ])
      .then((inserted) => {
        database.execute("select max(post) from post").then(async (max) => {
          console.log(max[0][0]["max(post)"]);
          let maxP = max[0][0]["max(post)"];
          for (let i = 0; i < actions.length; i++) {
            let insert = await database.execute(
              "insert into actionspost (post,action) VALUES (?,?)",
              [maxP, actions[i]]
            );
          }
          this.getAllPosts(req, res, next);
        });
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
            "update post set username=?,password=? where post=?",
            [posts[i].username, posts[i].password, posts[i].post]
          );
          let deleteActionsPost = await database.execute(
            "delete from actionspost where post=?",
            [posts[i].post]
          );
          for (let j = 0; j < posts[i].actions.length; j++) {
            let insert = await database.execute(
              "insert into actionspost (post,action) VALUES (?,?)",
              [posts[i].post, posts[i].actions[j].actions]
            );
          }
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
exports.deletePost = (req, res, next) => {
  const postId = req.body.post;

  if (!postId) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("delete from post where post=?", [postId])
      .then((deleteRes) => {
        database
          .execute("delete from actionspost where post=?", [postId])
          .then((deleteRes) => {
            this.getAllPosts(req, res, next);
          });
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                              Actions                                       *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

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
    database
      .execute("INSERT INTO actions (actions,name) VALUES (NULL,?)", [name])
      .then((resData) => {
        this.getAllActions(req, res, next);
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

exports.deleteAction = async (req, res, next) => {
  const actionID = req.body.action;

  if (!actionID) res.status(402).json({ message: "fill the required fields" });
  else {
    if (await this.isInPost(actionID)) {
      database
        .execute("delete from actions where actions=?", [actionID])
        .then((deleteRes) => {
          this.getAllActions(req, res, next);
        })
        .catch((err) => {
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        });
    } else {
      res.status(404).json({
        message: "You can not delete an action while is in post/posts",
      });
    }
  }
};

/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                               Users                                        *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

exports.getUsers = (req, res, next) => {
  database
    .execute("select * from users")
    .then((users) => {
      if (users[0].length > 0) {
        let returnUsers = [];
        for (let i = 0; i < users[0].length; i++) {
          returnUsers[i] = {
            id: users[0][i].id,
            fname: users[0][i].fname,
            lname: users[0][i].lname,
            password: users[0][i].password,
          };
        }
        res.status(200).json({ message: "Users", users: returnUsers });
      } else {
        res.status(200).json({ message: "No Users" });
      }
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.addUsers = (req, res, next) => {
  const user = req.body.user;

  if (!user) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("insert into users (fname,lname,password) VALUES(?,?,?)", [
        user.fname,
        user.lname,
        this.passwordGenerator(),
      ])
      .then((insertedUser) => {
        this.getUsers(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.updateUsers = async (req, res, next) => {
  const user = req.body.user;
  if (!user) res.status(402).json({ message: "fill the required fields" });
  else {
    if (user.length > 0) {
      for (let i = 0; i < user.length; i++) {
        let update = await database.execute(
          "update users set fname=?,lname=? where id=?",
          [user[i].fname, user[i].lname, user[i].id]
        );
      }
      this.getUsers(req, res, next);
    }
  }
};

exports.deleteUser = (req, res, next) => {
  const user = req.body.user;
  if (!user) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("delete from users where id=?", [user.id])
      .then((results) => {
        this.getUsers(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                               Categories                                   *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

exports.getcatPost = (req, res, next) => {
  database
    .execute("select * from categories")
    .then(async (categories) => {
      console.log(categories[0]);
      let returnCategory = [];
      for (let i = 0; i < categories[0].length; i++) {
        console.log(categories[0][i]);
        returnCategory[i] = {
          name: categories[0][i].name,
          category: categories[0][i].category,
          categoryPost: await this.getCatPostData(categories[0][i].category),
        };
      }
      console.log(returnCategory);
      res
        .status(200)
        .json({ message: "All Categories", categories: returnCategory });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.addcatPost = (req, res, next) => {
  const catId = req.body.catId;
  const postId = req.body.postId;
  const orderBy = req.body.orderBy;

  if (!catId || !postId || !orderBy) {
    res.status(402).json({ message: "fill the requried fields" });
  } else {
    database
      .execute("select  * from catpost where catId=? and orderBy >= ?", [
        catId,
        orderBy,
      ])
      .then(async (results) => {
        if (results[0].length > 0) {
          for (let i = 0; i < results[0].length; i++) {
            let update = await database.execute(
              "update catpost set orderBy=? where catPost=?",
              [+results[0][i].orderBy + 1, results[0][i].catPost]
            );
          }
        }
        database
          .execute(
            "insert into catpost (catId,postId,orderBy) VALUES (?,?,?)",
            [catId, postId, orderBy]
          )
          .then((inserted) => {
            this.getcatPost(req, res, next);
          })
          .catch((err) => {
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          });
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.updatecatPost = async (req, res, next) => {
  const category = req.body.category;
  if (!category) {
    res.status(402).json({ message: "fill the required fields" });
  } else {
    for (let i = 0; i < category.categoryPost.length; i++) {
      try {
        let update = await database.execute(
          "update catpost set orderBy=?, postId=? where catPost=?",
          [
            category.categoryPost[i].orderBy,
            category.categoryPost[i].post,
            category.categoryPost[i].catPost,
          ]
        );
      } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      }
    }
    this.getcatPost(req, res, next);
  }
};

exports.deletecatPost = (req, res, next) => {
  const catPost = req.body.catPost;
  if (!catPost) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("delete from catpost where catPost=?", [catPost])
      .then((deleteRes) => {
        this.getcatPost(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                            Production                                      *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

exports.addProduction = async (req, res, next) => {
  let clientID = await this.login();
  clientID = await this.authenticate(clientID);
  let production = await this.production1(clientID);
  console.log(production);
  let findocData = [];
  let finDocImportant = [];

  let prod3 = [];
  for (let i = 0; i < production.rows.length; i++) {
    findocData[i] = await this.production2(clientID, production.rows[i].FINDOC);
    console.log(findocData[i]);
    let ingredients = await this.production3(
      clientID,
      findocData[i].rows[0].MTRL
    );
    console.log("INGREDIENTS");
    console.log(ingredients.rows[1]);
    for (let j = 0; j < ingredients.rows.length; j++) {
      prod3[j] = {
        mtrl: ingredients.rows[j].MTRL,
        findoc: ingredients.rows[j].FINDOC,
        code: ingredients.rows[j].CODE,
        name: ingredients.rows[j].NAME,
        warning: ingredients.rows[j].WARNING ? ingredients.rows[j].WARNING : "",
        webname: ingredients.rows[j].WEBNAME ? ingredients.rows[j].WEBNAME : "",
      };
    }
    finDocImportant[i] = {
      findoc: findocData[i].rows[0].FINDOC,
      mtrl: findocData[i].rows[0].MTRL,
      category: findocData[i].rows[0].MTRGROUP,
      ingredients: prod3,
    };
  }
  for (let i = 0; i < finDocImportant.length; i++) {
    if ((await this.findocExists(finDocImportant[i].findoc)) != true) {
      let insert = await database.execute(
        "insert into production (findoc,mtrl,catId) VALUES(?,?,?)",
        [
          finDocImportant[i].findoc,
          finDocImportant[i].mtrl,
          finDocImportant[i].category,
        ]
      );
    } else {
      let update = await database.execute(
        "update production set mtrl=?,catId=? where findoc=?",
        [
          finDocImportant[i].mtrl,
          finDocImportant[i].category,
          finDocImportant[i].findoc,
        ]
      );
    }
    for (let j = 0; j < finDocImportant[i].ingredients.length; j++) {
      if (
        (await this.ingredientExists(finDocImportant[i].ingredients[j].mtrl)) !=
        true
      ) {
        let insertIng = await database.execute(
          "insert into ingredients (mtrl,ing_mtrl,code,warning,webname) VALUES (?,?,?,?,?)",
          [
            finDocImportant[i].mtrl,
            finDocImportant[i].ingredients[j].mtrl,
            finDocImportant[i].ingredients[j].code,
            finDocImportant[i].ingredients[j].warning,
            finDocImportant[i].ingredients[j].webname,
          ]
        );
      } else {
        let updateIng = await database.execute(
          "update ingredients set mtrl=?,code=?,warning=?,webname=? where ing_mtrl=?",
          [
            finDocImportant[i].mtrl,
            finDocImportant[i].ingredients[j].code,
            finDocImportant[i].ingredients[j].warning,
            finDocImportant[i].ingredients[j].webname,
            finDocImportant[i].ingredients[j].mtrl,
          ]
        );
      }
    }
  }

  this.addProdLine(req, res, next);
};

exports.addProdLine = (req, res, next) => {
  database
    .execute("select * from production")
    .then(async (results) => {
      let state;
      for (let i = 0; i < results[0].length; i++) {
        posts = await this.getCatPostData(results[0][i].catId);
        for (let j = 0; j < posts.length; j++) {
          if (posts[j].orderBy == 1) {
            state = 1;
          } else {
            state = 0;
          }
          if (
            (await this.prodLineExists(
              results[0][i].findoc,
              posts[j].post,
              posts[j].orderBy
            )) != true
          ) {
            let insert = await database.execute(
              "insert into prodline (findoc,post,orderBy,done) VALUES(?,?,?,?)",
              [results[0][i].findoc, posts[j].post, posts[j].orderBy, state]
            );
          }
        }
      }

      this.getProduction(req, res, next);
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
exports.updateProdLine = (req, res, next) => {
  const prodLine = req.body.prodLine;
  /*
    prodLine ={
        findoc:
        post:
        state:
        end : 
        date :
        totalTime :
        user :
    }
  */
  if (!prodLine) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("update prodline set done=? where findoc=? and post=?", [
        prodLine.done,
        prodLine.findoc,
        prodLine.post,
      ])
      .then((results) => {
            if(prodLine.done == 4 || prodLine.done == 3){
                database.execute('update machineTime set end=? where post=? and date=?',[
                    prodLine.end,prodLine.post,prodLine.date
                ])
            }
            this.getProduction(req,res,next)
          })
          .catch((err) => {
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          });
      }
     
  
};

exports.getProduction = (req, res, next) => {
  database
    .execute("select * from production")
    .then(async (results) => {
      console.log(results[0]);
      let returnProductions = [];
      for (let i = 0; i < results[0].length; i++) {
        returnProductions[i] = {
          findoc: results[0][i].findoc,
          mtrl: results[0][i].mtrl,
          ingredients: await this.getIngredients(results[0][i].mtrl),
          category: results[0][i].catId,
          categoryPost: await this.getCatPostData(results[0][i].catId),
          productionLine: await this.getprodLineSteps(results[0][i].findoc),
          time: results[0][i].time,
        };
      }
      res
        .status(200)
        .json({ message: "Production", production: returnProductions });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                               Time                                         *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

exports.getTime = (req, res, next) => {
  database
    .execute("select * from time")
    .then(async (results) => {
      let returnTime = [];
      for (let i = 0; i < results[0].length; i++) {
        returnTime[i] = {
          id: results[0][i].time,
          findoc: results[0][i].findoc,
          post: await this.postData(results[0][i].post),
          totalTime: results[0][i].totalTime,
          user: await this.getUserData(results[0][i].user),
          start: results[0][i].start,
          end: results[0][i].end,
          date: results[0][i].date,
        };
      }
      res.status(200).json({ message: "Time Data", time: returnTime });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.addTime = (req, res, next) => {
  const postsTime = req.body.userTime;
  /*
    postTime = {
        findoc : ,
        psot : ,
        user :,
        start : ,
        date : ,
    }
  */
  if (!postsTime) res.start(402).json({ message: "fill the requierd fields" });
  else {
    console.log(postsTime);
    database
      .execute(
        "insert into time (findoc,post,user,date,start) VALUES(?,?,?,?,?)",
        [
          postsTime.findoc,
          postsTime.post,
          postsTime.user,
          postsTime.date,
          postsTime.start,
        ]
      )
      .then(async (results) => {
        console.log(results[0]);
        if (
          (await this.machineHasStarted(postsTime.post, postsTime.date)) != true
        ) {
          await this.addMachineTime(
            postsTime.post,
            postsTime.date,
            postsTime.start
          );
        }
        this.getTime(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
exports.updateTime = (req, res, next) => {
  const endTimer = req.body.endTimer;
  /*
        endTimer = {
            findoc :
            post :
            end :
            totalTime:
            date :
            user
        }

    */
  if (!endTimer) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute(
        "update time set end=?,totalTime=? where findoc=? and date=? and user=? and post=?",
        [
          endTimer.end,
          endTimer.totalTime,
          endTimer.findoc,
          endTimer.date,
          endTimer.user,
          endTimer.post,
        ]
      )
      .then(async (results) => {
        this.getTime(req, res, next);
      })
      .catch((err) => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                            MachineTime                                     *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

exports.getMachineTime = (req, res, next) => {
  database
    .execute("select * from machinetime")
    .then(async (results) => {
      let returnMachineTime = [];
      for (let i = 0; i < results[0].length; i++) {
        let start = +results[0][i].start;
        let end = +results[0][i].end;
        returnMachineTime[i] = {
          id: results[0][i].machineTime,
          post: await this.postData(results[0][i].post),
          start: start.toFixed(2),
          end: end.toFixed(2),
          date: results[0][i].date,
        };
      }
      console.log(returnMachineTime);
      res
        .status(200)
        .json({ message: "Machine Times", time: returnMachineTime });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
exports.addMachineTime = async (post, date, start) => {
  let insert = await database
    .execute("insert into machineTime (post,start,date) VALUES (?,?,?)", [
      post,
      start,
      date,
    ])
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    });
  console.log("Machine Time Inserted");
};
exports.updateMachineTime = (end, post, date) => {
  database
    .execute("update machineTime set end=? where post=? and date=?", [
      end,
      post,
      date,
    ])
    .then((results) => {
      console.log("Machine Time Updated");
      return;
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    });
};
/******************************************************************************                                                   
 *                                                                            *
 *                                                                            *
 *                                                                            *
 *                            Functions                                       *
 *                                                                            *
 *                                                                            *
 *                                                                            *
 /******************************************************************************/

//function που χρησιμοποιώ εσωτερικά
//Μετατροπή του πίνακα actions απο [1,2,3] σε πίνακα με τις ονομασίες τους [action1,action2,action3]
exports.getActions = async (action) => {
  let actionObj = [];

  try {
    let actionsPost = await database.execute(
      "select * from actionspost where post=?",
      [action]
    );
    console.log(actionsPost[0]);
    if (actionsPost[0].length > 0) {
      for (let i = 0; i < actionsPost[0].length; i++) {
        let actions = await database.execute(
          "select * from actions where actions=?",
          [actionsPost[0][i].action]
        );
        actionObj[i] = {
          actions: actions[0][0].actions,
          name: actions[0][0].name,
        };
      }
      return actionObj;
    }

    return actionObj;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
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

// function για να κανει generate ενα password
exports.passwordGenerator = () => {
  var password = generator.generate({
    length: 10,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
    excludeSimilarCharacters: true,
    strict: true,
  });
  console.log(password);

  return password;
};

exports.isInPost = async (actionId) => {
  try {
    let findAction = await database.execute(
      "select * from actionspost where action=?",
      [actionId]
    );
    if (findAction[0].length > 0) return false;
    else return true;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

// function που παιρνει το ιδ μιας κατηγοριας και βρισκει τα αντιστοιχα ποστα και αλλες πληροφοριες
exports.getCatPostData = async (catId) => {
  let finddata = await database.execute(
    "select * from catpost where catId=? order by orderBy ASC",
    [catId]
  );
  console.log(catId);
  console.log(finddata[0]);
  try {
    let returnData = [];
    //ελεγχος για την κατηγορια αν εχει καταχωρημενα ποστα
    if (finddata[0].length > 0) {
      for (let i = 0; i < finddata[0].length; i++) {
        console.log(finddata[0][i]);
        returnData[i] = {
          catPost: finddata[0][i].catPost,
          post: finddata[0][i].postId,
          username: await this.findPostName(finddata[0][i].postId),
          orderBy: finddata[0][i].orderBy,
          actions: await this.findPostActions(finddata[0][i].postId),
        };
      }
    } else {
      returnData[0] = {
        post: "",
        name: "",
        orderBy: "",
        actions: "",
      };
    }
    return returnData;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

//function που παιρνει το ιδ ενος ποστου και βρισκει το ονομα
exports.findPostName = async (postId) => {
  let name = await database.execute("select * from post where post=?", [
    postId,
  ]);
  console.log(name[0]);
  return name[0][0].username;
};

// function που παιρνει το ιδ ενος ποστου και βρισκει τις ενεργειες που εχουν συσχετιστει με αυτο
exports.findPostActions = async (postId) => {
  let actions = await database.execute(
    "select * from actionspost where post=?",
    [postId]
  );
  try {
    console.log(actions[0]);
    let returnActions = [];
    if (actions[0].length > 0) {
      for (let i = 0; i < actions[0].length; i++) {
        console.log(actions[0][i]);
        returnActions[i] = {
          actions: actions[0][i].action,
          name: await this.getActionName(actions[0][i].action),
        };
      }
    } else {
      returnActions[0] = {
        actions: "",
        name: "",
      };
    }
    return returnActions;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

//function που παιρνει το ιδ μιας ενεργειας και βρισκει το ονομα της
exports.getActionName = async (actionId) => {
  console.log(actionId);
  let name = await database.execute("select * from actions where actions=?", [
    actionId,
  ]);
  console.log(name[0]);
  return name[0][0].name;
};

exports.getprodLineSteps = async (findoc) => {
  try {
    let getProdLine = await database.execute(
      "select * from prodline where findoc=?",
      [findoc]
    );
    let returnData = [];
    for (let i = 0; i < getProdLine[0].length; i++) {
      returnData[i] = {
        post: await this.postData(getProdLine[0][i].post),
        orderBy: getProdLine[0][i].orderBy,
        state: this.getState(getProdLine[0][i].done),
      };
    }
    return returnData;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

exports.postData = async (postID) => {
  let post = await database.execute("select * from post where post=?", [
    postID,
  ]);
  return {
    post: post[0][0].post,
    name: post[0][0].username,
    actions: await this.findPostActions(post[0][0].post),
  };
};
//function που παιρνει την κατασταση απο το prodline και βγαζει με text τι ειναι
exports.getState = (state) => {
  // αν ειναι 0 σημαινει οτι περιμενει
  // αν ειναι 1 σημαινει οτι γινεται
  // αν ειναι 2 σημαινει οτι τελειωσε
  if (state == 0) {
    return "Pending";
  } else if (state == 1) {
    return "Next Up";
  } else if (state == 2) {
    return "Running";
  } else if (state == 3) {
    return "Not Done/Paused";
  } else {
    return "Done";
  }
};
//function που παιρνει το id ενος χρηστη και επιστρεφει τα στοιχεια του
exports.getUserData = async (user) => {
  try {
    let userdata = await database.execute("select * from users where id=?", [
      user,
    ]);
    return {
      id: userdata[0][0].id,
      fname: userdata[0][0].fname,
      lname: userdata[0][0].lname,
      password: userdata[0][0].password,
    };
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};
exports.actionData = async (action) => {
  try {
    let actiondata = await database.execute(
      "select * from actions where actions=?",
      [action]
    );
    return {
      actions: actiondata[0][0].actions,
      name: actiondata[0][0].name,
    };
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

// softone functions

exports.login = async () => {
  var data = JSON.stringify({
    service: "login",
    username: "Sparke",
    password: "1234",
    appId: "3001",
  });

  let login = await axios(this.getConfig(data));
  try {
    let loginData = decoder.decode(login.data);
    console.log(JSON.parse(loginData));
    loginData = JSON.parse(loginData);
    return loginData.clientID;
  } catch (err) {
    throw err;
  }
};
exports.authenticate = async (clientID) => {
  var data = JSON.stringify({
    service: "authenticate",
    clientID: clientID,
    company: "1001",
    branch: "1000",
    module: "0",
    refid: "1",
  });

  let authenticate = await axios(this.getConfig(data));
  try {
    let authenticatedata = decoder.decode(authenticate.data);
    console.log(JSON.parse(authenticatedata));
    authenticatedata = JSON.parse(authenticatedata);
    return authenticatedata.clientID;
  } catch (err) {
    throw err;
  }
};

exports.production1 = async (clientID) => {
  var data = JSON.stringify({
    service: "SqlData",
    clientID: clientID,
    appId: "3001",
    SqlName: "1production",
  });
  let production = await axios(this.getConfig(data));
  try {
    let productionData = decoder.decode(production.data);
    productionData = JSON.parse(productionData);
    console.log(productionData);
    return productionData;
  } catch (err) {
    throw err;
  }
};
exports.production2 = async (clientID, findoc) => {
  var data = JSON.stringify({
    service: "SqlData",
    clientID: clientID,
    appId: "3001",
    SqlName: "2production",
    param1: findoc,
  });
  let production = await axios(this.getConfig(data));
  try {
    let productionData = decoder.decode(production.data);
    productionData = JSON.parse(productionData);
    console.log(productionData);
    return productionData;
  } catch (err) {
    throw err;
  }
};
exports.production3 = async (clientID, mtrl) => {
  var data = JSON.stringify({
    service: "SqlData",
    clientID: clientID,
    appId: "3001",
    SqlName: "3production",
    param1: mtrl,
  });
  let production3 = await axios(this.getConfig(data));
  try {
    let production = decoder.decode(production3.data);
    production = JSON.parse(production);
    console.log(production);
    return production;
  } catch (err) {
    throw err;
  }
};
exports.getConfig = (data) => {
  return {
    method: "post",
    url: "https://pca.oncloud.gr/s1services",
    headers: {
      "Content-Type": "application/json;charset=windows-1253",
      "X-APPSMITH-DATATYPE": "TEXT",
    },
    data,
    responseType: "arraybuffer",
    reponseEncoding: "binary",
  };
};

exports.getIngredients = async (mtrl) => {
  let ingredients = await database.execute(
    "select * from ingredients where mtrl=?",
    [mtrl]
  );
  try {
    let returnIng = [];
    for (let i = 0; i < ingredients[0].length; i++) {
      returnIng[i] = {
        ingredient: ingredients[0][i].ingredients,
        mtrl: ingredients[0][i].mtrl,
        ing_mtrl: ingredients[0][i].ing_mtrl,
        code: ingredients[0][i].code,
        warning: ingredients[0][i].warning,
        webname: ingredients[0][i].webname,
      };
      console.log(returnIng[i]);
    }
    return returnIng;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};
// function που ελεγχει με βαση το findoc αν εχει καταχωρηθει

exports.findocExists = async (findoc) => {
  let find = await database.execute("select * from production where findoc=?", [
    findoc,
  ]);

  if (find[0].length > 0) {
    return true;
  } else {
    return false;
  }
};
exports.ingredientExists = async (mtrl) => {
  let find = await database.execute(
    "select * from ingredients where ing_mtrl=?",
    [mtrl]
  );
  if (find[0].length > 0) {
    return true;
  } else {
    return false;
  }
};

exports.prodLineExists = async (findoc, post, orderBy) => {
  let find = await database.execute(
    "select * from prodline where findoc=? and post=? and orderBy=?",
    [findoc, post, orderBy]
  );
  if (find[0].length > 0) {
    return true;
  } else {
    return false;
  }
};
// function που ελεγχει αν ενα μηχανημα με βαση το ποστο εχει ξεκινησει
exports.machineHasStarted = async (post, date) => {
  let find = await database
    .execute("select * from machineTime where post=? and date=?", [post, date])
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    });
  if (find[0].length > 0) {
    return true;
  } else {
    return false;
  }
};
