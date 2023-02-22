const mssql = require("mssql");
const config = {
    user: "sa",
    password: "Puxa3418",
    server: "192.168.1.240",
    port: 1433,
    database: "PCA2DB",
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: false
    }
}

// make sure that any items are correctly URL encoded in the connection string




module.exports = {
    connection: async () => {
        try {
            await mssql.connect(config)
            let req = new mssql.Request();
            return {
                req: req,
                mssql:await mssql
            };
        } catch (err) {
            console.log(err);
            throw new Error(err)
        }


    }
}