const { default: axios } = require("axios");
const database = require("../database");
const generator = require("generate-password");
const decoder = new TextDecoder("ISO-8859-7");
const io = require("../socket");



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
       logger.error("Oh noes, something has gone terribly wrong");
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
          //// console.log(max[0][0]["max(post)"]);
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
         logger.error("Oh noes, something has gone terribly wrong");;
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
            await this.updateChangesActionLines(
              posts[i].post,
              posts[i].actions
            );
          }
        } catch (err) {
           logger.error("Oh noes, something has gone terribly wrong");;
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
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.usersInPost = (req, res, next) => {
  database
    .execute("select DISTINCT post from prodline")
    .then(async (posts) => {
      let returnPost = [];
      //// console.log(posts[0]);
      for (let i = 0; i < posts[0].length; i++) {
        //// console.log(posts);
        //// console.log(
        //   (await this.postIsSetInCurrentOrders(posts[0][i].post)) != false
        // );
        if ((await this.postIsSetInCurrentOrders(posts[0][i].post)) != false) {
          //// console.log("IS TRUE");
          returnPost[i] = await this.countOfUsers(posts[0][i].post);
        } else {
          returnPost[i] = {
            post: post.post,
            count: 0,
            users: [],
          };
        }
        //// console.log(returnPost);
      }
      res.status(200).json({ message: "Active Users", users_data: returnPost });
    })
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
exports.activePosts = (req, res, next) => {
  database.execute('select * from post')
    .then(async (posts) => {
      let returnPost = [];
      for (let i = 0; i < posts[0].length; i++) {
        returnPost[i] = {
          post: posts[0][i].post,
          name: posts[0][i].username,
          orders: await this.whichOrder(posts[0][i].post)
        }
      }
      res.status(200).json({ message: "Active Posts", posts: returnPost });
    })
    .catch(err => {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    })
}
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
       logger.error("Oh noes, something has gone terribly wrong");;
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
         logger.error("Oh noes, something has gone terribly wrong");;
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
           logger.error("Oh noes, something has gone terribly wrong");;
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
           logger.error("Oh noes, something has gone terribly wrong");;
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
       logger.error("Oh noes, something has gone terribly wrong");;
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
         logger.error("Oh noes, something has gone terribly wrong");;
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
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.pauseUser = (req, res, next) => {
  const time = req.body.time;
  /*
    time={
      findoc
      post
      user
      date 
      end
      totalTime
    }

  */
  if (!time) {
    res.status(402).json({ message: "fill the requried fields" });
  } else {
    database
      .execute(
        "update time set totalTime=? , end=? where findoc=? and post=? and user=? and date=? and end=? and totalTime=?",
        [
          time.totalTime,
          time.end,
          time.findoc,
          time.post,
          time.user,
          time.date,
          "0",
          "0",
        ]
      )
      .then((results) => {
        req.body.post = time.post;
        req.body.findoc = time.findoc;
        this.getSingleProduction(req, res, next);
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
exports.startUser = (req, res, next) => {
  const time = req.body.time;
  /*
    time={
      findoc
      post
      user
      date 
      start
    }

  */
  if (!time) res.status(402).json({ message: "fill the requried fields" });
  else {
    database
      .execute(
        "insert into time (findoc,post,user,date,start) VALUES (?,?,?,?,?)",
        [time.findoc, time.post, time.user, time.date, time.start]
      )
      .then((results) => {
        req.body.findoc = time.findoc;
        req.body.post = time.post;
        this.getSingleProduction(req, res, next);
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
exports.getTotalUserTimeBeetwenDates = (req, res, next) => {
  const fromDate = req.body.fromDate;
  const toDate = req.body.toDate;
  const user = req.body.user;
  if (!fromDate || !toDate) res.status(402).json({ message: "fill the required fields" });
  else {
    if (user) {
      database.execute('select totalTime from time where user=? and (date >= ? and date <= ?)', [
        user, fromDate, toDate
      ])
        .then(async totalTime => {
          let name = await database.execute('select fname from users where id=?', [user]);
          let time = this.calculateTotalUserTime(totalTime[0]);
          res.status(200).json({
            message: "Total Time of " + name[0][0].fname
            , time: time
          });
        })
        .catch(err => {
           logger.error("Oh noes, something has gone terribly wrong");;
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        })
    } else {
      database.execute('select * from users')
        .then(async users => {
          let returnUsers = [];
          for (let i = 0; i < users[0].length; i++) {
            let totalTime = await database.execute('select totalTime from time where user=? and (date >= ? and date <= ?)', [
              users[0][i].id, fromDate, toDate
            ]).catch(err => {
               logger.error("Oh noes, something has gone terribly wrong");;
              if (!err.statusCode) err.statusCode = 500;
              next(err);
            })
            returnUsers[i] = {
              message: "Total Time of " + users[0][i].fname,
              time: this.calculateTotalUserTime(totalTime[0])
            }
          }
          res.status(200).json(returnUsers);
        })
        .catch(err => {
           logger.error("Oh noes, something has gone terribly wrong");;
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        })
    }
  }

}
exports.activeUsers = async () => {
  let posts = await database.execute("select post from post").catch((err) => {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  });

  let returnPost = [];
  for (let i = 0; i < posts[0].length; i++) {

    if ((await this.postIsSetInCurrentOrders(posts[0][i].post)) != false) {
      returnPost[i] = await this.countOfUsers(posts[0][i].post);
    } else {
      returnPost[i] = {
        post: posts[0][i].post,
        count: 0,
        users: [],
      };
    }
  }
  return returnPost;
};
exports.getUserTime = (req, res, next) => {
  const user = req.body.user;
  const fromDate = req.body.fromDate;
  const toDate = req.body.toDate;
  const formatType = req.body.formatType;
  if (!fromDate || !toDate || !formatType) res.status(402).json({ message: "fill the required fields" });
  else {
    if (!user) {
      database
        .execute("select * from users")
        .then(async (users) => {
          let returnUsers = [];
          for (let i = 0; i < users[0].length; i++) {
            returnUsers[i] = {
              id: users[0][i].id,
              fname: users[0][i].fname,
              lname: users[0][i].lname,
              totalTime: await this.userTime(users[0][i].id, fromDate, toDate),
              time: await this.userTotalTime(
                users[0][i].id,
                fromDate,
                toDate,
                formatType
              )
            }
          }
          res.status(200).json({ message: "Users Time", users: returnUsers });
        })
        .catch((err) => {
           logger.error("Oh noes, something has gone terribly wrong");;
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        });
    } else {
      database
        .execute("select * from users where id=?", [user])
        .then(async (userData) => {
          res.status(200).json({ message: "User Time", user: [{ id: userData[0][0].id, fname: userData[0][0].fname, lname: userData[0][0].lname, totalTime: await this.userTime(user, fromDate, toDate), time: await this.userTotalTime(userData[0][0].id, fromDate, toDate, formatType) }] });
        })
    }
  }

};
exports.getSingleUserTime = (req, res, next) => {
  const user = req.body.user;
  if (!user) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("select * from users where id=?", [user])
      .then(async (userData) => {
        let findocs = await database
          .execute("select * from production")
          .catch((err) => {
             logger.error("Oh noes, something has gone terribly wrong");;
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          });
        let returnFindocs = [];
        for (let i = 0; i < findocs[0].length; i++) {
          returnFindocs[i] = {
            findoc: findocs[0][i].findoc,
            category: findocs[0][i].catId,
            time: await this.getUserTimeOnPosts(user, findocs[0][i].findoc),
          };
        }
        res.status(200).json({
          message: "Single User Time",
          id: user,
          fname: userData[0][0].fname,
          lname: userData[0][0].lname,
          times: returnFindocs,
        });
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
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
      //// console.log(categories[0]);
      let returnCategory = [];
      for (let i = 0; i < categories[0].length; i++) {
        //// console.log(categories[0][i]);
        returnCategory[i] = {
          name: categories[0][i].name,
          category: categories[0][i].category,
          categoryPost: await this.getCatPostData(categories[0][i].category),
        };
      }
      //// console.log(returnCategory);
      res
        .status(200)
        .json({ message: "All Categories", categories: returnCategory });
    })
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
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
          .then(async (inserted) => {
            this.addProduction(req, res, next);
            this.getcatPost(req, res, next);
          })
          .catch((err) => {
             logger.error("Oh noes, something has gone terribly wrong");;
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          });
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
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
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      }
    }
    this.orderByOnProdLine(category);
    this.getcatPost(req, res, next);
  }
};

exports.deletecatPost = (req, res, next) => {
  const catPost = req.body.catPost;
  if (!catPost) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("select * from catpost where catPost=?", [catPost])
      .then((results) => {
        //// console.log("RESULTS");
        //// console.log(results[0]);
        database
          .execute("select * from catpost where orderBy > ? and catId=?", [
            results[0][0].orderBy,
            results[0][0].catId,
          ])
          .then(async (orderBy) => {
            //// console.log("ORDERBY");
            //// console.log(orderBy[0]);
            for (let i = 0; i < orderBy[0].length; i++) {
              let update = await database.execute(
                "update catpost set orderBy=? where catPost=?",
                [+orderBy[0][i].orderBy - 1, orderBy[0][i].catPost]
              );
            }
            database
              .execute("delete from catpost where catPost=?", [catPost])
              .then((deleteRes) => {
                this.getcatPost(req, res, next);
              });
          });
      })

      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
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


exports.pausePost = async (req, res, next) => {
  const prodLine = req.body.prodLine;
  /*
    proline ={
       findoc
       post      
    }
   */
  if (!prodLine) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("update prodline set done=3 where findoc=? and post=?", [
        prodLine.findoc,
        prodLine.post,
      ])
      .then((results) => {
        this.emitOrderStarted(prodLine.findoc, prodLine.post);
        req.body.findoc = prodLine.findoc;
        req.body.post = prodLine.post;
        this.getSingleProduction(req, res, next);
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
exports.startPostAfterPause = async (req, res, next) => {
  const prodLine = req.body.prodLine;
  /*
    prodLine ={
      findoc
      date 
      start
      users[
        {
          id
        }
      ]
    }
  */
  if (!prodLine) res.status(402).json({ message: "fill the required fields" });
  else {
    for (let i = 0; i < prodLine.users.length; i++) {
      let insert = await database.execute(
        "insert into time set findoc=?,post=?,user=?,date=?,start=?",
        [
          prodLine.findoc,
          prodLine.post,
          prodLine.users[i].id,
          prodLine.date,
          prodLine.start,
        ]
      );
    }
    database
      .execute("update prodline set done=2 where findoc=? and post=?", [
        prodLine.findoc,
        prodLine.post,
      ])
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
    this.emitOrderStarted(prodLine.findoc, prodLine.post);
    (req.body.findoc = prodLine.findoc), (req.body.post = prodLine.post);
    this.getSingleProduction(req, res, next);
  }
};
exports.sendProduction = (req, res, next) => {
  const production = req.body.production;
  if (!production)
    res.status(402).json({ message: "fill the required fields" });
  else {
    //// console.log(production);
    try {
      io.getIO().emit("production", {
        action: "Production",
        production: production,
      });

      res
        .status(200)
        .json({ message: "Production Has Been sent Successfully" });
    } catch (err) {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  }
};
exports.postHasStarted = async (findoc, post) => {
  let update = await database.execute(
    "update prodline set done=2 where findoc=? and post=?",
    [findoc, post]
  );
  this.emitOrderStarted(findoc, post);
};
exports.getSingleProduction = (req, res, next) => {
  const findoc = req.body.findoc;
  const post = req.body.post;
  if (!findoc || !post) {
    res.status(402).json({ message: "fill the required fields" });
  } else {
    database
      .execute("select * from production where findoc=?", [findoc])
      .then(async (results) => {
        //// console.log("POSTS");
        res.status(200).json({
          message: "Single Production",
          production: {
            findoc: results[0][0].findoc,
            mtrl: results[0][0].mtrl,
            ingredients: await this.getIngredients(results[0][0].mtrl),
            category: results[0][0].catId,
            categoryPost: await this.getCatPostData(results[0][0].catId),
            productionLine: await this.getprodLineSteps(results[0][0].findoc),
            time: results[0][0].time,
            actionLines: await this.getActionLines(results[0][0].findoc, post),
          },
        });
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
exports.addProduction = async (req, res, next) => {
  let clientID = await this.login();
  clientID = await this.authenticate(clientID);
  let production = await this.production1(clientID);
  //// console.log(production);
  let findocData = [];
  let finDocImportant = [];

  let prod3 = [];
  for (let i = 0; i < production.rows.length; i++) {
    findocData[i] = await this.production2(clientID, production.rows[i].FINDOC);
    //// console.log(findocData[i]);
    let ingredients = await this.production3(
      clientID,
      findocData[i].rows[0].MTRL
    );
    //// console.log("INGREDIENTS");
    //// console.log(ingredients.rows[1]);
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
      let del = await database.execute("delete from prodLine");
      let state;
      for (let i = 0; i < results[0].length; i++) {
        posts = await this.getCatPostData(results[0][i].catId);
        //// console.log("FINDOC FOR ACTION LINES");
        //// console.log(results[0][i].findoc);
        await this.addActionLines(results[0][i].findoc);
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
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
exports.getAndUpdateOrderby = async (data, category) => {
  //// console.log("DATA");
  //// console.log(data);
  //// console.log("CATEGORY");
  //// console.log(category);
  for (let i = 0; i < category.categoryPost.length; i++) {
    //// console.log(category.categoryPost[i]);
    let state;
    if (category.categoryPost[i].orderBy == 1) {
      state = 2;
    } else {
      state = 0;
    }

    let update = await database.execute(
      "update prodline set orderBy=?,done=? where post=? and findoc=?",
      [
        category.categoryPost[i].orderBy,
        state,
        category.categoryPost[i].post,
        data,
      ]
    );
  }
};
exports.orderByOnProdLine = async (category) => {
  let catId = await database.execute(
    "select catId from catpost where catPost=?",
    [category.categoryPost[0].catPost]
  );
  try {
    database
      .execute("select findoc from production where catId=?", [
        catId[0][0].catId,
      ])
      .then(async (results) => {
        for (let i = 0; i < results[0].length; i++) {
          //// console.log("RESULTS");
          //// console.log(results[0][i]);
          await this.getAndUpdateOrderby(results[0][i].findoc, category);
        }
        //// console.log("DONE");
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        throw new Error(err.message);
      });
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw err;
  }
};
exports.updateProdLine = (req, res, next) => {
  const prodLine = req.body.prodLine;
  /*
    prodLine ={
        findoc:
        post:
        done:
        end: 
        date:
        user:
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
      .then(async (results) => {
        if (prodLine.done == 4 || prodLine.done == 3) {
          this.emitOrderStarted(prodLine.findoc, prodLine.post);
          if (prodLine.done == 4) {

            //// console.log("PROLINE.DONE == 4");
            await this.whoMakeItDone(
              prodLine.user,
              prodLine.findoc,
              prodLine.post
            );
            await this.setNextUp(prodLine.findoc, prodLine.post);
            this.updateActionLine(prodLine.findoc, prodLine.post);
          }
          database.execute(
            "update machinetime set end=? where post=? and date=?",
            [prodLine.end, prodLine.post, prodLine.date]
          );
        }
        this.getProduction(req, res, next);
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};
exports.setNextUp = async (findoc, post) => {
  let currentOrder = await database.execute(
    "select orderBy from prodline where findoc=? and post=?",
    [findoc, post]
  );
  try {
    let nextUp = await database.execute(
      "select * from prodline where findoc=? and orderBy=?",
      [findoc, +currentOrder[0][0].orderBy + 1]
    );
    if (nextUp[0].length > 0) {
      //// console.log("NEXT UP");
      //// console.log(nextUp[0][0]);
      let update = await database.execute(
        "update prodline set done=1 where findoc=? and post=?",
        [findoc, nextUp[0][0].post]
      );
      this.emitOrderStarted(findoc, post);
    }
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  }
};
exports.getProduction = (req, res, next) => {
  database
    .execute("select * from production")
    .then(async (results) => {
      //// console.log(results[0]);
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
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
exports.updateActionLines = async (req, res, next) => {
  const actionLine = req.body.actionLine;
  const user = req.body.user;
  /*
    actionLine =[{
      findoc:
      post:
      action:
      state
    }]

  */
  if (!actionLine) {
    res.status(402).json({ message: "fill the required fields" });
  } else {
    for (let i = 0; i < actionLine.length; i++) {

      let update = await database.execute(
        "update actionlines set state=? where findoc=? and post=? and action=?",
        [
          actionLine[i].state,
          actionLine[i].findoc,
          actionLine[i].post,
          actionLine[i].action,
        ]
      ).catch(err => {

        
    
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
    }
    if (user) {
      if (
        (await this.allActionsOnPostAreDone(
          actionLine[0].findoc,
          actionLine[0].post
        )) === true
      ) {
        await this.setNextUp(actionLine[0].findoc, actionLine[0].post);
        let done = await database
          .execute("update prodline set done=4 where findoc=? and post=?", [
            actionLine[0].findoc,
            actionLine[0].post,
          ])

          .catch((err) => {
             logger.error("Oh noes, something has gone terribly wrong");;
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          });
        this.emitOrderStarted(actionLine[0].findoc, actionLine[0].post);

        await this.whoMakeItDone(
          user,
          actionLine[0].findoc,
          actionLine[0].post
        );
        io.getIO().emit("done", {
          action:
            "Post " +
            (await this.findPostName(actionLine[0].post)) +
            " has been done",
          production: await this.getSingleProd(
            actionLine[0].findoc,
            actionLine[0].post
          ),
        });
      }
    }
    req.body.findoc = actionLine[0].findoc;
    req.body.post = actionLine[0].post;
    //// console.log("HELLo");
    //// console.log(req.body.findoc);
    //// console.log(req.body.post);
    this.getSingleProduction(req, res, next);
  }
};
exports.getSingleProd = async (findoc, post) => {
  let prod = await database
    .execute("select * from production where findoc=?", [findoc])
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err.message);
    });

  //// console.log("POSTS");
  return {
    message: "Single Production",
    production: {
      findoc: prod[0][0].findoc,
      mtrl: prod[0][0].mtrl,
      ingredients: await this.getIngredients(prod[0][0].mtrl),
      category: prod[0][0].catId,
      categoryPost: await this.getCatPostData(prod[0][0].catId),
      productionLine: await this.getprodLineSteps(prod[0][0].findoc),
      time: prod[0][0].time,
      actionLines: await this.getActionLines(prod[0][0].findoc, post),
    },
  };
};
exports.getActionLines = async (findoc, post) => {
  let actionLine = await database.execute(
    "select * from actionlines where findoc=? and post=?",
    [findoc, post]
  );
  let returnActionLine = [];
  for (let i = 0; i < actionLine[0].length; i++) {
    returnActionLine[i] = {
      findoc: findoc,
      post: post,
      name: await this.getActionName(actionLine[0][i].action),
      action: actionLine[0][i].action,
      state: this.getActionLineState(actionLine[0][i].state),
    };
  }
  return returnActionLine;
};
exports.getActionLineState = (state) => {
  if (state == "0" || state == 0) {
    return "PENDING";
  } else {
    return "DONE";
  }
};

exports.allActionsOnPostAreDone = async (findoc, post) => {
  let find = await database.execute(
    "select * from actionlines where findoc=? and post=?",
    [findoc, post]
  );
  try {
    let doneActions = [];
    let coutDoneActions = 0;
    for (let i = 0; i < find[0].length; i++) {
      if (find[0][i].state == 1) {
        doneActions[coutDoneActions] = true;
        coutDoneActions++;
      }
    }
    //// console.log("IF STATEMENT");
    //// console.log(find[0].length);
    //// console.log(doneActions.length);
    if (find[0].length == doneActions.length) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  }
};
exports.getStateOfProductions = (req, res, next) => {
  database
    .execute("select * from production")
    .then(async (production) => {
      let returnProduction = [];
      for (let i = 0; i < production[0].length; i++) {
        returnProduction[i] = {
          findoc: production[0][i].findoc,
          mtrl: production[0][i].mtrl,
          category: production[0][i].catId,
          posts: await this.getprodLineSteps(production[0][i].findoc),
        };
      }
      res
        .status(200)
        .json({ message: "All Productions", productions: returnProduction });
    })
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
exports.allPostsAreDone = async (findoc) => {
  let posts = await database.execute("select * from prodline where findoc=?", [
    findoc,
  ]);
  let donePosts = [];
  try {
    for (let i = 0; i < posts[0].length; i++) {
      if (posts[0][i].done == 4) {
        donePosts[i] = true;
      }
    }
    if (posts[0].length == donePosts.length) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  }
};
exports.getProductionState = (req, res, next) => {
  database.execute("select * from production")
    .then(async productionData => {
      let returnStates = [];
      for (let i = 0; i < productionData[0].length; i++) {
        // console.log(productionData[0][i].time);
        // αν το ταιμ στο προνταξιον δεν ειναι 0 σημαινει οτι εχει τελειωσει οποτε δε χρειαζεται να ελεγχτουν τα ποστα της για να βγει συμπερασμα
        // αν ομως ειναι 0 τοτε πρεπει να ελεγχτουν τα ποστα της για να δουμε σε τι κατασταση ειναι (και μπορει και σε τι σταδιο βρισκεται)
        if (productionData[0][i].time != 0 || productionData[0][i].time != '0') {
          returnStates.push({ findoc: productionData[0][i].findoc, message: "Order Has Been Finished" });
        }
        else {
          returnStates.push({ findoc: productionData[0][i].findoc, message: await this.searchInPostsState(productionData[0][i].findoc) })
        }
      }
      res.status(200).json({ message: "All Productions States", states: returnStates })
    })
    .catch(err => {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    })
}
exports.totalTimeOfProduction = (req, res, next) => {
  database.execute("select * from production where time !=?", [0])
    .then(productiondata => {
      let returnProductionData = [];
      for (let i = 0; i < productiondata[0].length; i++) {
        returnProductionData.push({ findoc: productiondata[0][i].findoc, time: productiondata[0][i].time })
      }
      if (returnProductionData.length == 0) {
        res.status(200).json({ message: "No Production Has Been Finished", data: returnProductionData })
      } else {
        res.status(200).json({ message: "All Productions", data: returnProductionData })
      }
    })
};
exports.addExtraPostInProd = (req, res, next) => {
  const findoc = req.body.findoc;
  const post = req.body.post;
  const orderBy = req.body.orderBy;
  if (!findoc || !post || !orderBy) {
    res.status(402).json({ message: "Please Fill All Fields" })
  } else {
    database.execute('update prodline set orderBy=orderBy+1 where findoc=? and orderBy >= ?', [findoc, orderBy])
      .then(async (updates) => {
        database.execute('insert into prodline (findoc,post,orderBy) values (?,?,?)', [findoc, post, orderBy])
      })
      .then(inserted => {
        res.status(200).json({ message: "Post Added Successfully" })
      })
      .catch(err => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      })
  }
};
exports.removePostFromProd = async (req, res, next) => {
  const findoc = req.body.findoc;
  const post = req.body.post;
  if (!findoc || !post) {
    res.status(402).json({ message: "Please Fill All Fields" })
  } else {
    let orderBy = await database.execute('select * from prodline where findoc=? and post=?', [findoc, post])
      .catch(err => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      })
    database.execute('update prodline set orderBy=orderBy-1 where findoc=? and orderBy > ?', [findoc, orderBy[0][0].orderBy])
      .then(results => {
        database.execute('delete from prodline where findoc=? and post=?', [findoc, post])
          .catch(err => {
            if (!err.statusCode) err.statusCode = 500;
            next(err);
          })
      })
      .finally(deleteRes => {
        res.status(200).json({ message: "Post Removed Successfully" })
      })
      .catch(err => {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      })
  }
}
exports.addExtraActionInProd = async (req, res, next) => {
  const findoc = req.body.findoc;
  const action = req.body.action;
  const post = req.body.post;
  if (!findoc || !action || !post) {
    res.status(402).json({ message: "Please Fill All Fields" })
  } else {
    if (await this.actionLineExists(findoc, action, post) != true) {
      database.execute('insert into actionlines (findoc,post,action) values (?,?,?)', [findoc, post, action])
        .then(insertRest => {
          res.status(200).json({ message: 'Action Added Successfully' })
        })
        .catch(err => {
          if (!err.statusCode) err.statuCode = 500;
          next(err);
        })
    } else {
      res.status(200).json({ message: 'Action Already Exists' })
    }
  }
}
exports.removeActionFromProd = async (req, res, next) => {
  const findoc = req.body.findoc;
  const action = req.body.action;
  const post = req.body.post;
  if (!findoc || !action || !post) {
    res.status(402).json({ message: "Please Fill All Fields" })
  } else {
    database.execute('delete from actionlines where findoc=? and post=? and action=?', [findoc, post, action])
      .then(deleteRes => {
        res.status(200).json({ message: 'Action Removed Successfully' })
      })
      .catch(err => {
        if (!err.statusCode) err.statuCode = 500;
        next(err);
      })
  }
};
exports.resetProduction = (req, res, next) => {
  const findoc = req.body.findoc;
  if (!findoc) {
    res.status(402).json({ message: 'Fill The Requried Fields' })
  } else {
    database.execute('select * from prodline where findoc=?', [findoc])
      .then(async prodLines => {
        let updated = false;
        let pos = 0;
        for (let i = 0; i < prodLines[0].length; i++) {
          if (
            ((prodLines[0][i].done == 2 || prodLines[0][i].done == "2") ||
              (prodLines[0][i].done == 3 || prodLines[0][i].done == "3")) &&
            (prodLines[0][i].orderBy != 1 || prodLines[0][i].orderBy != "1")
          ) {
            console.log(prodLines[0][i]);
            let updateProdLine = await database.execute('update prodline set done=0 where findoc=? and post=?', [findoc, prodLines[0][i].post])
              .catch(err => {
                if (!err.statusCode) err.statuCode = 500;
                next(err);
              })
            let updateActionLine = await database.execute('update actionlines set state=0 where findoc=? and post=?', [findoc, prodLines[0][i].post])
              .catch(err => {
                if (!err.statusCode) err.statuCode = 500;
                next(err);
              })
            pos = i;
            updated = true;
            console.log(updated)
            break;
          }
        }
        let firstIsRunning = await database.execute('select done from prodline where findoc=? and orderBy=1', [findoc]);

        console.log(updated);
        if (updated) {
          console.log(prodLines[0][pos].orderBy - 1);
          let updatePrevious = await database.execute('update prodline set done=2 where findoc=? and orderBy=?', [findoc, prodLines[0][pos].orderBy - 1])
        } else if (!updated && (firstIsRunning[0][0].done != 2 || firstIsRunning[0][0].done != "2")) {
          let max = await database.execute('select max(orderBy) as max from prodline where findoc=?', [findoc])
            .catch(err => {
              if (!err.statusCode) err.statuCode = 500;
              next(err);
            })
          await database.execute('update prodline set done=2 where findoc=? and orderBy=?', [findoc, max[0][0].max])
            .catch(err => {
              if (!err.statusCode) err.statuCode = 500;
              next(err);
            })
        }
        res.status(200).json({ message: 'Production Reset Successfully' })
      })
      .catch(err => {
        if (!err.statusCode) err.statuCode = 500;
        next(err);
      })
  }
}
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
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.addTime = async (req, res, next) => {
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
  if (!postsTime) res.status(402).json({ message: "fill the requierd fields" });
  else {
    //// console.log(postsTime);
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
        io.getIO().emit("login", {
          action: "Login",
          users_data: await this.activeUsers(),
        });
        this.postHasStarted(postsTime.findoc, postsTime.post);
        //// console.log(results[0]);
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
         logger.error("Oh noes, something has gone terribly wrong");;
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
        "update time set end=?,totalTime=? where end=? and findoc=? and date=? and user=? and post=?",
        [
          endTimer.end,
          endTimer.totalTime,
          "0",
          endTimer.findoc,
          endTimer.date,
          endTimer.user,
          endTimer.post,
        ]
      )
      .then(async (results) => {
        if (
          (await this.postHasFinished(endTimer.findoc, endTimer.post)) == true
        ) {
          if (
            (await this.orderIsNotFinished(endTimer.findoc, endTimer.post)) !=
            true
          ) {
            let updateState = await database
              .execute("update prodline set done=3 where findoc=? and post=?", [
                endTimer.findoc,
                endTimer.post,
              ])
              .catch((err) => {
                 logger.error("Oh noes, something has gone terribly wrong");;
                if (!err.statusCode) err.statusCode = 500;
                next(err);
              });
            this.emitOrderStarted(endTimer.findoc, "");
          }
          if ((await this.allPostsAreDone(endTimer.findoc)) === true) {
            this.setProductionAsDone(endTimer.findoc);
          }

          await this.updateMachineTime(
            endTimer.end,
            endTimer.post,
            endTimer.date
          );
        }
        io.getIO().emit("logout", {
          action: "logout",
          users_data: await this.activeUsers(),
          user_logged_out: await this.getUserData(endTimer.user),
        });

        this.getTime(req, res, next);
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        if (!err.statusCode) err.statusCode = 500;
        next(err);
      });
  }
};

exports.getSingleStateOfProduction = (req, res, next) => {
  const findoc = req.body.findoc;
  if (!findoc) res.status(402).json({ message: "fill the required fields" });
  else {
    database
      .execute("select * from production where findoc=?", [findoc])
      .then(async (prodData) => {
        res.status(200).json({
          message: "Sigle State of Production",
          production: {
            findoc: findoc,
            mtrl: prodData[0][0].mtrl,
            category: prodData[0][0].catId,
            posts: await this.getprodLineSteps(findoc),
          },
        });
      })
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
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
  const fromDate = req.body.fromDate;
  const toDate = req.body.toDate;
  const post = req.body.post;
  const format = req.body.formatType;
  if (!fromDate || !toDate || !format)
    res.status(402).json({ message: "fill the required fields" })
  else {
    if (!post) {
      database.execute("select * from post")
        .then(async posts => {
          let returnPosts = [];
          for (let i = 0; i < posts[0].length; i++) {
            returnPosts[i] = {
              id: posts[0][i].post,
              name: posts[0][i].username,
              totalTime: await this.machineTotalTime(posts[0][i].post, fromDate, toDate),
              time: await this.machineTime(posts[0][i].post, fromDate, toDate, format)
            };
          }
          res.status(200).json({
            message: "Machine Time",
            posts: returnPosts
          })
        })
        .catch(err => {
           logger.error("Oh noes, something has gone terribly wrong");;
          if (!err.statusCode) err.statusCode = 500;
          next(err);
        })
    }
    else {
      database.execute("select * from post where post=?", [post])
        .then(async (postsData) => {
          res.status(200).json({
            message: "Machine Time",
            post: [{
              id: postsData[0][0].post,
              name: postsData[0][0].username,
              totalTime: await this.machineTotalTime(postsData[0][0].post, fromDate, toDate),
              time: await this.machineTime(postsData[0][0].post, fromDate, toDate, format)
            }]
          })
        })
    }
  }
};
exports.addMachineTime = async (post, date, start) => {
  let insert = await database
    .execute("insert into machinetime (post,start,date) VALUES (?,?,?)", [
      post,
      start,
      date,
    ])
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    });
  //// console.log("Machine Time Inserted");
};
exports.updateMachineTime = (end, post, date) => {
  database
    .execute("update machinetime set end=? where post=? and date=?", [
      end,
      post,
      date,
    ])
    .then((results) => {
      //// console.log("Machine Time Updated");
      return;
    })
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
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
    //// console.log(actionsPost[0]);
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
     logger.error("Oh noes, something has gone terribly wrong");;
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
  //// console.log(password);

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
     logger.error("Oh noes, something has gone terribly wrong");;
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
  //// console.log(catId);
  //// console.log(finddata[0]);
  try {
    let returnData = [];
    //ελεγχος για την κατηγορια αν εχει καταχωρημενα ποστα
    if (finddata[0].length > 0) {
      for (let i = 0; i < finddata[0].length; i++) {
        //// console.log(finddata[0][i]);
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
     logger.error("Oh noes, something has gone terribly wrong");;
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

//function που παιρνει το ιδ ενος ποστου και βρισκει το ονομα
exports.findPostName = async (postId) => {
  let name = await database.execute("select * from post where post=?", [
    postId,
  ]);
  //// console.log(name[0]);
  return name[0][0].username;
};

// function που παιρνει το ιδ ενος ποστου και βρισκει τις ενεργειες που εχουν συσχετιστει με αυτο
exports.findPostActions = async (postId) => {
  let actions = await database.execute(
    "select * from actionspost where post=?",
    [postId]
  );
  try {
    //// console.log(actions[0]);
    let returnActions = [];
    if (actions[0].length > 0) {
      for (let i = 0; i < actions[0].length; i++) {
        //// console.log(actions[0][i]);
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
     logger.error("Oh noes, something has gone terribly wrong");;
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

//function που παιρνει το ιδ μιας ενεργειας και βρισκει το ονομα της
exports.getActionName = async (actionId) => {
  //// console.log(actionId);
  let name = await database.execute("select * from actions where actions=?", [
    actionId,
  ]);
  //// console.log(name[0]);
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
        time: await this.calcTotalTimeOfPost(getProdLine[0][i].post, findoc),
      };
    }
    return returnData;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
     logger.error("Oh noes, something has gone terribly wrong");;
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
     logger.error("Oh noes, something has gone terribly wrong");;
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
    //// console.log(JSON.parse(loginData));
    loginData = JSON.parse(loginData);
    return loginData.clientID;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
    //// console.log(JSON.parse(authenticatedata));
    authenticatedata = JSON.parse(authenticatedata);
    return authenticatedata.clientID;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
    //// console.log(productionData);
    return productionData;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
    //// console.log(productionData);
    return productionData;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
    //// console.log(production);
    return production;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
      //// console.log(returnIng[i]);
    }
    return returnIng;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
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
    .execute("select * from machinetime where post=? and date=? and end=?", [
      post,
      date,
      "0",
    ])
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    });
  if (find[0].length > 0) {
    return true;
  } else {
    return false;
  }
};
exports.addActionLines = async (findoc) => {
  //// console.log("FINDOC IN ACTION LINE");
  //// console.log(findoc);
  let post = await database.execute(
    "select post from prodline where findoc=?",
    [findoc]
  );
  //// console.log("POST");
  //// console.log(post[0]);
  for (let i = 0; i < post[0].length; i++) {
    let postData = await this.postData(post[0][i].post);
    //// console.log("POST DATA");
    //// console.log(postData);
    for (let j = 0; j < postData.actions.length; j++) {
      if (
        (await this.actionLineExists(
          findoc,
          post[0][i].post,
          postData.actions[j].actions
        )) != true
      ) {
        let insert = await database.execute(
          "insert into actionlines(findoc,post,action) VALUES(?,?,?)",
          [findoc, post[0][i].post, postData.actions[j].actions]
        );
      }
    }
  }
};
exports.updateActionLine = async (findoc, post) => {
  let update = await database.execute(
    "update actionlines set state=4 where findoc=? and post=?",
    [findoc, post]
  );
};
exports.actionLineExists = async (findoc, action, post) => {
  let find = await database.execute(
    "select * from actionlines where findoc=? and post=? and action=?",
    [findoc, action, post]
  );
  try {
    if (find[0].length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw err;
  }
};

//function που ελεγχει με βαση τις ενεργες κατηγοριες αν ειναι καταχωρημενα στην παραγωγη
exports.postIsSetInCurrentOrders = async (post) => {
  //// console.log("post Is Set In Current Orders");
  let categories = await database.execute(
    "select DISTINCT catId from production"
  );
  let found = false;
  for (let i = 0; i < categories[0].length; i++) {
    let find = await database.execute(
      "select DISTINCT postId from catpost where postId=?",
      [post]
    );
    if (find[0].length > 0) {
      return true;
    }
  }

  if (found) {
    return found;
  } else {
    return found;
  }
};

exports.countOfUsers = async (post) => {
  //// console.log("COUNT");
  let users = await database.execute(
    "select DISTINCT user from time where post=? and end=? and totalTime=?",
    [post, "0", "0"]
  );
  let count = 0;
  let returnUsers = [];
  //// console.log(users[0]);
  for (let i = 0; i < users[0].length; i++) {
    returnUsers[count] = await this.getUserData(users[0][i].user);
    count++;
  }
  return {
    post: post,
    name: await this.findPostName(post),
    count: count,
    users: returnUsers,
  };
};
exports.updateChangesActionLines = async (post, actions) => {
  //// console.log("update Changes Action Lines");
  //// console.log("POST");
  //// console.log(post);
  //// console.log("ACTIONS");
  //// console.log(actions);
  let count = await database.execute(
    "select DISTINCT action from actionlines where post=?",
    [post]
  );

  //// console.log("ACTIONS FROM ACTION LINES QUERY");
  //// console.log(count[0]);

  if (actions.length == count[0].length) {
    //// console.log("NO CHANGES");
  } else {
    //// console.log("SOMETHING CHANGED");
    let findocs = await database.execute(
      "select DISTINCT findoc from actionlines"
    );
    let del = await database.execute("delete from actionlines where post=?", [
      post,
    ]);
    for (let i = 0; i < findocs[0].length; i++) {
      await this.addActionLines(findocs[0][i].findoc);
    }
  }
};

exports.whoMakeItDone = async (user, findoc, post) => {
  let isnertByWho = await database
    .execute("update prodline set byWho=? where findoc=? and post=? ", [
      user,
      findoc,
      post,
    ])
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err.message);
    });
};
//function που παιρνει ενα ποστο και εναν κωδικο μιας παραγγελιας και υπολογιζει τον συνολικο χρονο
exports.calcTotalTimeOfPost = async (post, findoc) => {
  let stateOfPost = await this.getStateOfPost(post, findoc);
  let returnDates = [];
  if (stateOfPost == 4 || stateOfPost == 3) {
    // console.log("POST IS DONE");
    let min = await database.execute(
      "select min(date) as min from time where post=? and findoc=?  and end != ? and totalTime!= ?",
      [post, findoc, "0", "0"]
    );
    let max = await database.execute(
      "select max(date) as max from time where post=? and findoc=?  and end != ? and totalTime!= ?",
      [post, findoc, "0", "0"]
    );
    let minDate = min[0][0].min;
    let maxDate = max[0][0].max;
    // console.log("MIN DATE");
    // console.log(minDate);
    // console.log("MAX DATE");
    // console.log(maxDate);
    returnDates = await this.calculateTotalTime(post, findoc, minDate, maxDate);
  } else {
    let dates = await database
      .execute(
        "select DISTINCT date from time where post=? and findoc=? and end != ? and totalTime!= ?",
        [post, findoc, "0", "0"]
      )
      .catch((err) => {
         logger.error("Oh noes, something has gone terribly wrong");;
        throw new Error(err.message);
      });

    for (let i = 0; i < dates[0].length; i++) {
      // console.log("DATES");
      // console.log(dates[0][i].date);
      returnDates[i] = {
        date: dates[0][i].date,
        totalTime: await this.totalTime(post, findoc, dates[0][i].date),
      };
    }
  }
  return returnDates;
};
exports.calculateTotalTime = async (post, findoc, min, max) => {
  let time = await database.execute(
    "select * from time where post=? and findoc=? and date >=? and date <=? and totalTime !=?",
    [post, findoc, min, max, "0"]
  );
  try {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    for (let i = 0; i < time[0].length; i++) {
      hours += this.getHours(time[0][i].totalTime);
      if (minutes + this.getMinutes(time[0][i].totalTime) >= 60) {
        hours++;
        minutes = this.getMinutes(time[0][i].totalTime) + minutes - 60;
      } else {
        minutes += this.getMinutes(time[0][i].totalTime);
      }
      if (seconds + this.getSeconds(time[0][i].totalTime) >= 60) {
        minutes++;
        seconds = this.getSeconds(time[0][i].totalTime) + seconds - 60;
      } else {
        seconds += this.getSeconds(time[0][i].totalTime);
      }
      // console.log("HOURS");
      // console.log(hours);
      // console.log("MINUTES");
      // console.log(minutes);
      // console.log("SECONDS");
      // console.log(seconds);
    }
    return {
      hr: hours,
      min: minutes,
      sec: seconds,
      start: min,
      end: max,
    };
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  }
};
exports.getStateOfPost = async (post, findoc) => {
  let state = await database.execute(
    "select done from prodline where post=? and findoc=?",
    [post, findoc]
  );
  try {
    return state[0][0].done;
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  }
};
exports.totalTime = async (post, findoc, date) => {
  let timeOfPost = await database.execute(
    "select * from time where post=? and findoc=? and end != ? and totalTime != ? and date=?",
    [post, findoc, "0", "0", date]
  );
  // console.log("QUERY");
  // // console.log(
  //   `select * from time where post=${post} and findoc=${findoc} and end != 0 and totalTime != 0 and date=${date}`
  // );
  // console.log(timeOfPost[0]);
  // console.log(timeOfPost[0].length);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  for (let i = 0; i < timeOfPost[0].length; i++) {
    hours += this.getHours(timeOfPost[0][i].totalTime);
    if (minutes + this.getMinutes(timeOfPost[0][i].totalTime) >= 60) {
      hours++;
      minutes = minutes + this.getMinutes(timeOfPost[0][i].totalTime) - 60;
    } else {
      minutes += this.getMinutes(timeOfPost[0][i].totalTime);
    }
    if (seconds + this.getSeconds(timeOfPost[0][i].totalTime) >= 60) {
      minutes++;
      seconds = seconds + this.getSeconds(timeOfPost[0][i].totalTime) - 60;
    } else {
      seconds += this.getSeconds(timeOfPost[0][i].totalTime);
    }
    // console.log(hours + ":" + minutes + ":" + seconds);
  }
  // hours = hours < 10 ? "0" + hours : hours;
  // minutes = minutes < 10 ? "0" + minutes : minutes;
  // seconds = seconds < 10 ? "0" + seconds : seconds;
  return {
    hr: hours,
    min: minutes,
    sec: seconds,
  };
};

exports.getHours = (time) => {
  return parseInt(time.split(":")[0]);
};
exports.getMinutes = (time) => {
  return parseInt(time.split(":")[1]);
};
exports.getSeconds = (time) => {
  return parseInt(time.split(":")[2]);
};
exports.orderIsNotFinished = async (findoc, post) => {
  let state = await database.execute(
    "select done from prodline where post=? and findoc=?",
    [post, findoc]
  );
  if (state[0][0].done == 4) {
    return true;
  } else {
    return false;
  }
};

exports.postHasFinished = async (findoc, post) => {
  let count = await database.execute(
    "select * from time where post=? and findoc=? and end=? and totalTime=?",
    [post, findoc, "0", "0"]
  );
  console.log(count[0].length);
  if (count[0].length == 0) {
    return true;
  } else {
    return false;
  }
};


exports.userTotalTime = async (user, fromDate, toDate, formatType) => {
  // console.log("USER TOTAL TIME");
  let dates = await database.execute(
    "select DISTINCT date  from time where (date >= ? and date <= ?) and user=?  and end!=?",
    [fromDate, toDate, user, "0"]
  );


  let returnTime = [];
  if (formatType == 1 || formatType == "1") {
    let allDates = this.getDates(new Date(this.formatDate2(fromDate)), new Date(this.formatDate2(toDate)));
    // console.log(allDates);
    for (let i = 0; i < dates[0].length; i++) {
      // console.log("QUERY RESULT");
      // console.log(dates[0]);
      let timeOfPost = await database.execute('select totalTime from time where date=? and user=? and end!=?', [
        dates[0][i].date, user, "0"
      ])
      try {
        for (let j = 0; j < timeOfPost[0].length; j++) {
          allDates[this.findIndex(allDates, dates[0][i].date)].hr += this.getHours(timeOfPost[0][j].totalTime);
          if (allDates[this.findIndex(allDates, dates[0][i].date)].min + this.getMinutes(timeOfPost[0][j].totalTime) >= 60) {
            allDates[this.findIndex(allDates, dates[0][i].date)].hr++;
            allDates[this.findIndex(allDates, dates[0][i].date)].min += this.getMinutes(timeOfPost[0][j].totalTime) - 60;
          } else {
            allDates[this.findIndex(allDates, dates[0][i].date)].min += this.getMinutes(timeOfPost[0][j].totalTime);
          }
          if (allDates[this.findIndex(allDates, dates[0][i].date)].sec + this.getSeconds(timeOfPost[0][j].totalTime) >= 60) {
            allDates[this.findIndex(allDates, dates[0][i].date)].min++;
            allDates[this.findIndex(allDates, dates[0][i].date)].sec += this.getSeconds(timeOfPost[0][j].totalTime) - 60;
          } else {
            allDates[this.findIndex(allDates, dates[0][i].date)].sec += this.getSeconds(timeOfPost[0][j].totalTime);
          }
        }

      } catch (err) {
         logger.error("Oh noes, something has gone terribly wrong");;
        throw new Error(err.message);
      }


    }
    for (let date = 0; date < allDates.length; date++) {
      allDates[date].hr = +allDates[date].hr;
      allDates[date].min = +allDates[date].min;
      allDates[date].sec = +allDates[date].sec;
      if (allDates[date].hr < 10 && allDates[date].hr != "00" || allDates[date].hr == 0) {
        // console.log(allDates[date].hr);
        allDates[date].hr = "0" + allDates[date].hr;
      }
      if (allDates[date].min < 10 && allDates[date].min != "00" || allDates[date].min == 0) {
        allDates[date].min = "0" + allDates[date].min;
      }
      if (allDates[date].sec < 10 && allDates[date].sec != "00" || allDates[date].sec == 0) {
        allDates[date].sec = "0" + allDates[date].sec;
      }

    }
    returnTime = allDates;
  } else {
    // expected date format 20230101 i need the month to calculate the total time of each month
    let months = Array(this.getMonth(toDate));

    for (let k = 0; k < months.length; k++) {
      months[k] = { month: this.getMonthName(k + 1), hr: 0, min: 0, sec: 0 }
    }

    let currentMonth;
    // console.log(months);
    for (let i = 0; i < dates[0].length; i++) {
      currentMonth = this.getMonth(dates[0][i].date);
      let timeOfPost = await database.execute('select totalTime from time where date=? and user=? and end!=?', [dates[0][i].date, user, "0"]);
      for (let j = 0; j < timeOfPost[0].length; j++) {
        // console.log(months[currentMonth - 1].hr);
        months[currentMonth - 1].hr += this.getHours(timeOfPost[0][j].totalTime);
        if (months[currentMonth - 1].min + this.getMinutes(timeOfPost[0][j].totalTime) >= 60) {
          months[currentMonth - 1].hr++;
          months[currentMonth - 1].min = months[currentMonth - 1].min + this.getMinutes(timeOfPost[0][j].totalTime) - 60;
        } else {
          months[currentMonth - 1].min += this.getMinutes(timeOfPost[0][j].totalTime);
        }
        if (months[currentMonth - 1].sec + this.getSeconds(timeOfPost[0][j].totalTime) >= 60) {
          months[currentMonth - 1].min++;
          months[currentMonth - 1].sec = months[currentMonth - 1].sec + this.getSeconds(timeOfPost[0][j].totalTime) - 60;
        } else {
          months[currentMonth - 1].sec += this.getSeconds(timeOfPost[0][j].totalTime);
        }
      }

    }
    for (let month = 0; month < months.length; month++) {
      months[month].hr = months[month].hr < 10 ? "0" + months[month].hr : months[month].hr;
      months[month].min = months[month].min < 10 ? "0" + months[month].min : months[month].min;
      months[month].sec = months[month].sec < 10 ? "0" + months[month].sec : months[month].sec;
    }
    returnTime = months;
  }




  return returnTime;

};
exports.findIndex = (array, value) => {
  for (let i = 0; i < array.length; i++) {
    if (array[i].date == value) {
      return i;
    }
  }
}
exports.getDates = (startDate, endDate) => {
  // console.log(startDate);
  // console.log(endDate);
  const date = new Date(startDate.getTime());

  const dates = [];

  while (date <= endDate) {
    let day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    let month = date.getMonth() < 10 ? "0" + (date.getMonth() + 1) : date.getMonth();
    let year = date.getFullYear();
    dates.push({
      date: year + month + day,
      hr: 0,
      min: 0,
      sec: 0
    });
    date.setDate(date.getDate() + 1);
  }

  return dates;



}
exports.getMonthName = (month) => {
  // console.log(month);
  let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return months[month - 1];
}
exports.formatDate = (date) => {
  date = date.toString();
  // expected format 20230101 to 2023-01-01
  let year = date.slice(0, 4);
  let month = date.slice(4, 6);
  let day = date.slice(6, 8);
  return day + "/" + month + "/" + year;
}
exports.formatDate2 = (date) => {
  date = date.toString();
  // expected format 20230101 to 2023-01-01
  let year = date.slice(0, 4);
  let month = date.slice(4, 6);
  let day = date.slice(6, 8);
  return year + "-" + month + "-" + day;
}
exports.getMonth = (date) => {
  date = date.toString();
  return +date.slice(4, 6);
}
exports.getMachineTimeByDate = async (post, date) => {
  let timeOfPost = await database.execute(
    "select totalTime from time where post=? and date=?",
    [post, date]
  );
  // console.log("QUERY");
  // console.log(
  //   `select totalTime from time where post=${post} and date=${date}`,
  //   [post, date]
  // );
  // console.log("QUERY RESULT");
  // console.log(timeOfPost[0]);
  try {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    for (let i = 0; i < timeOfPost[0].length; i++) {
      hours += this.getHours(timeOfPost[0][i].totalTime);
      if (minutes + this.getMinutes(timeOfPost[0][i].totalTime) >= 60) {
        hours++;
        minutes = minutes + this.getMinutes(timeOfPost[0][i].totalTime) - 60;
      } else {
        minutes += this.getMinutes(timeOfPost[0][i].totalTime);
      }
      if (seconds + this.getSeconds(timeOfPost[0][i].totalTime) >= 60) {
        minutes++;
        seconds = seconds + this.getSeconds(timeOfPost[0][i].totalTime) - 60;
      } else {
        seconds += this.getSeconds(timeOfPost[0][i].totalTime);
      }
      // console.log(hours + ":" + minutes + ":" + seconds);
    }
    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    return {
      hr: hours,
      min: minutes,
      sec: seconds,
    };
  } catch (err) {
     logger.error("Oh noes, something has gone terribly wrong");;
    throw new Error(err.message);
  }
};

exports.setProductionAsDone = async (findoc) => {
  let totalTime = await database
    .execute("select totalTime from time where findoc=?", [findoc])
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err.message);
    });
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  for (let i = 0; i < totalTime[0].length; i++) {
    hours += this.getHours(totalTime[0][i].totalTime);
    if (minutes + this.getMinutes(totalTime[0][i].totalTime) >= 60) {
      hours++;
      minutes = minutes + this.getMinutes(totalTime[0][i].totalTime) - 60;
    } else {
      minutes += this.getMinutes(totalTime[0][i].totalTime);
    }
    if (seconds + this.getSeconds(totalTime[0][i].totalTime) >= 60) {
      minutes++;
      seconds = seconds + this.getSeconds(totalTime[0][i].totalTime) - 60;
    } else {
      seconds += this.getSeconds(totalTime[0][i].totalTime);
    }
    console.log("HOURS :" + hours);
    console.log("MINUTES :" + minutes);
    console.log("SECONDS :" + seconds);
  }
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  let totalProductionTime = hours + ":" + minutes + ":" + seconds;
  // console.log("TOTAL PRODUCTION TIME");
  //console.log(totalProductionTime);
  database
    .execute("update production set time=? where findoc=?", [
      totalProductionTime,
      findoc,
    ])
    .then((results) => {
      // console.log(results);
    })
    .catch((err) => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err.message);
    });
};

exports.searchInPostsState = async (findoc) => {
  let posts = await database.execute('select * from prodline where findoc=?', [findoc])
    .catch(err => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err.message);
    })
  for (let i = 0; i < posts[0].length; i++) {
    if (posts[0][i].done == 2) {
      return "Post " + await this.findPostName(posts[0][i].post) + " is " + this.getState(posts[0][i].done);
    }
    if (posts[0][i].done == 3) {
      return "Post " + await this.findPostName(posts[0][i].post) + " is " + this.getState(posts[0][i].done);
    }
    if (posts[0][i].done == 1) {
      return "Post " + await this.findPostName(posts[0][i].post) + " is " + this.getState(posts[0][i].done);
    }
  }
}
exports.calculateTotalUserTime = (arrayOfTimes) => {
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  // console.log(arrayOfTimes);
  for (let i = 0; i < arrayOfTimes.length; i++) {
    hours += this.getHours(arrayOfTimes[i].totalTime);
    if (minutes + this.getMinutes(arrayOfTimes[i].totalTime) >= 60) {
      hours++;
      minutes = minutes + this.getMinutes(arrayOfTimes[i].totalTime) - 60;
    } else {
      minutes += this.getMinutes(arrayOfTimes[i].totalTime);
    }
    if (seconds + this.getSeconds(arrayOfTimes[i].totalTime) >= 60) {
      minutes++;
      seconds = seconds + this.getSeconds(arrayOfTimes[i].totalTime) - 60;
    } else {
      seconds += this.getSeconds(arrayOfTimes[i].totalTime);
    }
  }

  return {
    hr: hours,
    min: minutes,
    sec: seconds,
  };
}
exports.userTime = async (user, fromDate, toDate) => {
  let totalTime = await database.execute('select totalTime from time where user=? and (date >= ? and date <= ?)', [
    user, fromDate, toDate
  ]).catch(err => {
     logger.error("Oh noes, something has gone terribly wrong");;
    if (!err.statusCode) err.statusCode = 500;
    throw new Error(err);
  })
  let time = this.calculateTotalUserTime(totalTime[0]);
  return time
}
exports.machineTotalTime = async (machinePost, fromDate, toDate) => {
  let totalTime = await database.execute('select subtime(end,start) as totalTime from machinetime where post=? and end!=?  and (date >= ? and date <= ?)', [machinePost, "0", fromDate, toDate])
    .catch(err => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err)
    })
  // console.log(totalTime[0]);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  for (let i = 0; i < totalTime[0].length; i++) {
    // console.log(totalTime[0][i].totalTime);
    hours += this.getHours(totalTime[0][i].totalTime);
    if (minutes + this.getMinutes(totalTime[0][i].totalTime) >= 60) {
      hours++;
      minutes = minutes + this.getMinutes(totalTime[0][i].totalTime) - 60;
    } else {
      minutes += this.getMinutes(totalTime[0][i].totalTime);
    }
    if (seconds + this.getSeconds(totalTime[0][i].totalTime) >= 60) {
      minutes++;
      seconds = seconds + this.getSeconds(totalTime[0][i].totalTime) - 60;
    } else {
      seconds += this.getSeconds(totalTime[0][i].totalTime);
    }
  }
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  return {
    hr: hours,
    min: minutes,
    sec: seconds,
  }
}
exports.machineTime = async (machinePost, from, to, format) => {
  let dates = await
    database
      .execute('select DISTINCT date from machinetime where post=? and end!=?  and (date >= ? and date <= ?)', [machinePost, "0", from, to])
      .catch(err => {
         logger.error("Oh noes, something has gone terribly wrong");;
        throw new Error(err);
      })
  // console.log("DATES");
  // console.log(dates[0]);
  let returnTime = [];
  if (format == 1 || format == "1") {
    let allDates = this.getDates(new Date(this.formatDate2(from)), new Date(this.formatDate2(to)));
    // console.log(allDates);
    for (let i = 0; i < dates[0].length; i++) {
      let timeOfPost = await database.execute('select subtime(end,start) as totalTime from machinetime where post=? and end!=? and date=?', [machinePost, "0", dates[0][i].date])
        .catch(err => {
           logger.error("Oh noes, something has gone terribly wrong");;
          throw new Error(err);
        })
      for (let j = 0; j < timeOfPost[0].length; j++) {
        allDates[this.findIndex(allDates, dates[0][i].date)].hr += this.getHours(timeOfPost[0][j].totalTime);
        if (allDates[this.findIndex(allDates, dates[0][i].date)].min + this.getMinutes(timeOfPost[0][j].totalTime) >= 60) {
          allDates[this.findIndex(allDates, dates[0][i].date)].hr++;
          allDates[this.findIndex(allDates, dates[0][i].date)].min = allDates[this.findIndex(allDates, dates[0][i].date)].min + this.getMinutes(timeOfPost[0][j].totalTime) - 60;
        } else {
          allDates[this.findIndex(allDates, dates[0][i].date)].min += this.getMinutes(timeOfPost[0][j].totalTime);
        }
        if (allDates[this.findIndex(allDates, dates[0][i].date)].sec + this.getSeconds(timeOfPost[0][j].totalTime) >= 60) {
          allDates[this.findIndex(allDates, dates[0][i].date)].min++;
          allDates[this.findIndex(allDates, dates[0][i].date)].sec = allDates[this.findIndex(allDates, dates[0][i].date)].sec + this.getSeconds(timeOfPost[0][j].totalTime) - 60;
        } else {
          allDates[this.findIndex(allDates, dates[0][i].date)].sec += this.getSeconds(timeOfPost[0][j].totalTime);
        }
      }
    }
    for (let date = 0; date < allDates.length; date++) {
      allDates[date].hr = +allDates[date].hr;
      allDates[date].min = +allDates[date].min;
      allDates[date].sec = +allDates[date].sec;
      if (allDates[date].hr < 10 && allDates[date].hr != "00" || allDates[date].hr == 0) {
        // console.log(allDates[date].hr);
        allDates[date].hr = "0" + allDates[date].hr;
      }
      if (allDates[date].min < 10 && allDates[date].min != "00" || allDates[date].min == 0) {
        allDates[date].min = "0" + allDates[date].min;
      }
      if (allDates[date].sec < 10 && allDates[date].sec != "00" || allDates[date].sec == 0) {
        allDates[date].sec = "0" + allDates[date].sec;
      }

    }
    returnTime = allDates;
  } else {
    // console.log(dates);
    let months = Array(this.getMonth(to));
    for (let m = 0; m < months.length; m++) {
      months[m] = {
        month: this.getMonthName(m + 1),
        hr: 0,
        min: 0,
        sec: 0
      };
    }
    // console.log(months);
    let currentMonth;
    for (let i = 0; i < dates[0].length; i++) {
      currentMonth = this.getMonth(dates[0][i].date);
      let timeOfPost = await database.execute('select subtime(end,start) as totalTime from machinetime where post=? and end!=? and date=?', [machinePost, "0", dates[0][i].date])
        .catch(err => {
           logger.error("Oh noes, something has gone terribly wrong");;
          throw new Error(err);
        })
      for (let j = 0; j < timeOfPost[0].length; j++) {
        months[currentMonth - 1].hr += this.getHours(timeOfPost[0][j].totalTime);
        if (months[currentMonth - 1].min + this.getMinutes(timeOfPost[0][j].totalTime) >= 60) {
          months[currentMonth - 1].hr++;
          months[currentMonth - 1].min = months[currentMonth - 1].min + this.getMinutes(timeOfPost[0][j].totalTime) - 60;
        } else {
          months[currentMonth - 1].min += this.getMinutes(timeOfPost[0][j].totalTime);
        }
        if (months[currentMonth - 1].sec + this.getSeconds(timeOfPost[0][j].totalTime) >= 60) {
          months[currentMonth - 1].min++;
          months[currentMonth - 1].sec = months[currentMonth - 1].sec + this.getSeconds(timeOfPost[0][j].totalTime) - 60;
        } else {
          months[currentMonth - 1].sec += this.getSeconds(timeOfPost[0][j].totalTime);
        }
      }
    }
    for (let month = 0; month < months.length; month++) {
      months[month].hr = months[month].hr < 10 ? "0" + months[month].hr : months[month].hr;
      months[month].min = months[month].min < 10 ? "0" + months[month].min : months[month].min;
      months[month].sec = months[month].sec < 10 ? "0" + months[month].sec : months[month].sec;
    }
    returnTime = months;
  }
  return returnTime
}

exports.whichOrder = async (post) => {
  let order = await database.execute('select findoc from prodline where post=? and done=2', [post])
    .catch(err => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err);
    })
  // console.log(order[0]);


  let returnOrdes = [];
  for (let i = 0; i < order[0].length; i++) {
    returnOrdes[i] = order[0][i].findoc;
  }
  return returnOrdes;

}
exports.emitOrderStarted = (findoc, post) => {
  database.execute('select * from post')
    .then(async posts => {
      let returnPost = [];
      let has = [];
      for (let i = 0; i < posts[0].length; i++) {
        returnPost[i] = {
          post: posts[0][i].post,
          name: posts[0][i].username,
          orders: await this.whichOrder(posts[0][i].post)
        }
      }
      // console.log(returnPost);
      io.getIO().emit('activeOrder', {
        message: "Active Posts",
        posts: returnPost
      });
    })
    .catch(err => {
       logger.error("Oh noes, something has gone terribly wrong");;
      throw new Error(err);
    })
}