const database = require("../database");
const jwt = require("jsonwebtoken");
exports.login = (req, res, next) => {
    if (!req.body.password || !req.body.name) {
        res.status(422).json({ message: "Fill The Required Fields" });
    } else {
        let name = req.body.name;
        let password = req.body.password;

        if (password.length < 1) {
            res
                .status(422)
                .json({ message: "Your Password Must Be 8 characters long" });
        } else {
            // the user is able to perform login action
            database
                .execute(`select * from post where username=` + `'` + name + `'`)
                .then((results) => {
                    let checkPassword = false;
                    if (results[0].length != 0) {
                        if (results[0][0].password == password) {
                            checkPassword = true;
                        } else {
                            checkPassword = false;
                        }
                        if (checkPassword) {
                            const token = jwt.sign(
                                {
                                    name: results[0][0].username,
                                    id: results[0][0].id,
                                },
                                "somesupersecretsecret"
                            );
                            res.status(200).json({
                                success:1,
                                message: "You Have Successfully Logged In",
                                token: token,
                                username:results[0][0].username,
                                id:results[0][0].post,
                                isAdmin:results[0][0].isAdmin
                            });
                            console.log(token);
                            // CORRECT PASSWORD SO GIVE TOKEN
                        } else {
                            res.status(422).json({ message: "Wrong Password" });
                        }
                    } else {
                        res.status(422).json({ message: "Wrong Username" });
                    }
                })
                .catch((err) => {
                    if (!err.statusCode) {
                        err.statusCode = 500;
                    }
                    next(err);
                });
        }
    }
};

exports.userLogin =(req,res,next) =>{
    if (!req.body.password) {
        res.status(422).json({ message: "Fill The Required Fields" });
    } else {
        let password = req.body.password;
        if (password.length < 1) {
            res
                .status(422)
                .json({ message: "Your Password Must Be 8 characters long" });
        } else {
            // the user is able to perform login action
            database
                .execute('select * from users where password=?',[password])
                .then((results) => {
                    let checkPassword = false;
                    if (results[0].length != 0) {
                        if (results[0][0].password == password) {
                            checkPassword = true;
                        } else {
                            checkPassword = false;
                        }
                        if (checkPassword) {
                            const token = jwt.sign(
                                {
                                    name: results[0][0].fname,
                                    lname:results[0][0].lname,
                                    id: results[0][0].id,
                                },
                                "somesupersecretsecret"
                            );
                            res.status(200).json({
                                success:1,
                                message: "You Have Successfully Logged In",
                                token: token,
                                name:results[0][0].fname,
                                last:results[0][0].lname,
                                password:results[0][0].password,
                                id:results[0][0].id,
                            });
                            console.log(token);
                            // CORRECT PASSWORD SO GIVE TOKEN
                        } else {
                            res.status(422).json({ message: "Wrong Password" });
                        }
                    } else {
                        res.status(422).json({ message: "Wrong Username" });
                    }
                })
                .catch((err) => {
                    if (!err.statusCode) {
                        err.statusCode = 500;
                    }
                    next(err);
                });
        }
    }
}

exports.adminLogin = (req,res,next) =>{
    if (!req.body.password || !req.body.name) {
        res.status(422).json({ message: "Fill The Required Fields" });
    } else {
        let name = req.body.name;
        let password = req.body.password;
        if (password.length < 1) {
            res
                .status(422)
                .json({ message: "Your Password Must Be 8 characters long" });
        } else {
            // the user is able to perform login action
            database
                .execute('select * from admins where username=?',[name])
                .then((results) => {
                    let checkPassword = false;
                    if (results[0].length != 0) {
                        if (results[0][0].password == password) {
                            checkPassword = true;
                        } else {
                            checkPassword = false;
                        }
                        if (checkPassword) {
                            const token = jwt.sign(
                                {
                                    name: results[0][0].fname,
                                    lname:results[0][0].lname,
                                    id: results[0][0].id,
                                },
                                "somesupersecretsecret"
                            );
                            res.status(200).json({
                                success:1,
                                message: "You Have Successfully Logged In",
                                token: token,
                                fname:results[0][0].fname,
                                lname:results[0][0].lname,
                                id:results[0][0].trdr,
                            });
                            console.log(token);
                            // CORRECT PASSWORD SO GIVE TOKEN
                        } else {
                            res.status(422).json({ message: "Wrong Password" });
                        }
                    } else {
                        res.status(422).json({ message: "Wrong Username" });
                    }
                })
                .catch((err) => {
                    if (!err.statusCode) {
                        err.statusCode = 500;
                    }
                    next(err);
                });
        }
    }
}