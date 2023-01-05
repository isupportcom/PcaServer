const { default: axios } = require("axios");
const database = require("../database");
const generator = require("generate-password");

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
    const postId= req.body.postId;
    const orderBy = req.body.orderBy;

    if(!catId || !postId || !orderBy){
        res.status(402).json({message:"fill the requried fields"});
    }else{
        database.execute('select  * from catpost where catId=? and orderBy >= ?',[catId,orderBy])
        .then(async results=>{

            if(results[0].length > 0 ){
                for(let i = 0 ; i < results[0].length ; i++){
                    let update = await database.execute('update catpost set orderBy=? where catPost=?',[+results[0][i].orderBy+1,results[0][i].catPost])
                }
            }
            database.execute('insert into catpost (catId,postId,orderBy) VALUES (?,?,?)',[catId,postId,orderBy])
            .then(inserted=>{
                this.getcatPost(req,res,next);
            })  
            .catch(err=>{
                if(!err.statusCode) 
                    err.statusCode = 500;
                next(err);
            })
        }).catch(err=>{
            if(!err.statusCode) err.statusCode =500;
            next(err);
        })
       
    }
};

exports.updatecatPost = async(req, res, next) => {
    const catPost =req.body.catPost;
    const catId = req.body.catId;
    const postId = req.body.postId;
    const orderBy = req.body.orderBy;

    if(!catPost || !catId || !postId || !orderBy){
        res.status(402).json({message:"fill the required fields"});
    }else{
        for(let i = 0 ; i<catPost.length ; i++){
          try{
            let update = await database.execute('update catpost set catId=?,postId=?,orderBy=? where catPost=?',
            [catId[i],postId[i],orderBy[i],catPost[i]]
            )
        }catch(err){
            if(!err.statusCode) err.statusCode =500;
            next(err);
        }
    }
    this.getcatPost(req,res,next);
    }
};

exports.deletecatPost = (req, res, next) => {
    const catPost = req.body.catPost;
    if(!catPost) res.status(402).json({message:"fill the required fields"});
    else{
        database.execute('delete from catpost where catPost=?',[catPost])
            .then(deleteRes=>{
                this.getcatPost(req,res,next);
            })
            .catch(err=>{
                if(!err.statusCode) err.statusCode =500;
                next(err);
            })
    }


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
  let finddata = await database.execute("select * from catpost where catId=?", [
    catId,
  ]);
  console.log(catId);
  console.log(finddata[0])
  try {
    let returnData = [];
    //ελεγχος για την κατηγορια αν εχει καταχωρημενα ποστα
    if (finddata[0].length > 0) {
      for (let i = 0; i < finddata[0].length; i++) {
        console.log(finddata[0][i])
        returnData[i] = {
          catPost: finddata[0][i].catPost,
          post: finddata[0][i].postId,
          username: await this.findPostName(finddata[0][i].postId),
          orderBy: finddata[0][i].orderBy,
          actions: await this.findPostActions(finddata[0][i].postId),
        };
      }
    } else {
        returnData[0] ={
            post:"",
            name:"",
            orderBy:"",
            actions:""
        }
    }
    return returnData;
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }
};

//function που παιρνει το ιδ ενος ποστου και βρισκει το ονομα
exports.findPostName = async (postId) =>{
    let name = await database.execute('select * from post where post=?',[postId]);
    console.log(name[0]);
    return name[0][0].username
};

// function που παιρνει το ιδ ενος ποστου και βρισκει τις ενεργειες που εχουν συσχετιστει με αυτο
exports.findPostActions = async (postId) =>{
    let actions =  await database.execute('select * from actionspost where post=?',[postId]);
    try{
        console.log(actions[0]);
        let returnActions =[];
        if(actions[0].length > 0 ){
            for(let i = 0 ; i < actions[0].length;i++){
                console.log(actions[0][i])
                returnActions[i] = {
                    actions: actions[0][i].action,
                    name : await this.getActionName(actions[0][i].action)
                }
            }
        }else{
            returnActions[0] = {
                actions :"",
                name :""
            }
        }
        return returnActions;
    }catch(err){
        if(!err.statusCode) 
            err.statusCode =500;
        throw(err);
    }
}

//function που παιρνει το ιδ μιας ενεργειας και βρισκει το ονομα της 
exports.getActionName = async (actionId) =>{
    console.log(actionId);
    let name = await database.execute('select * from actions where actions=?',[actionId]);
    console.log(name[0]);
    return name[0][0].name;
}
