const database = require('./database');
const mssql = require("mssql");
const io = require('./socket');
const {
    addProdLine,
    getIngredients,
    getCatPostData,
    getprodLineSteps
} = require('./controllers/dashboard');
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



getRq = () => {
    return new mssql.Request();
}

// setInterval(async() => {
//     console.log('start');
let test = async () => {
    /*
    
    Βρισκει τα παραστατικά που επιστρέφει το mantis (το bool01 είναι αν είναι παραστατικό που 
        δεν το έχει περάσει ήδη)
                                   (το int01 είναι το παραγόμενο)
                                   (το int02 είναι η ποσότητα του παραγόμενου)
     
     
            TRNDATE σημερινη ημερομηνια
            FISCPRD τρεχον ετος
            PERIOD μηνας
            SERIESNUM το τελευταιο παραστατικο+1 απο το κατω query και αν δε βρει τιποτα 
            FINCODE βάζω το όνομα της παραγγελίας
    
    */

    await mssql.connect(config);

    getRq()
        .query(`
   select findoc,TRNDATE,FISCPRD,PERIOD,FINCODE,BRANCH,int01 as paragomeno,int02 as pos_parag
   from findoc f 
   where f.company = 1001 and f.sosource = 1351 and f.FULLYTRANSF = 0 and
    (f.series = 2014 or f.series = 7014 or f.series = 8014) 
    and bool01= 0
   `)
        .then(async results => {
            console.log(results)
            for (let i = 0; i < results.recordset.length; i++) {
                let findoc = results.recordset[i].findoc;
                //παίρνω και όλες τις γραμμές του παραστατικού με το findoc της παραγγελίας
                let grammesParastatikou = await getRq()
                    .input('findoc', mssql.Int, findoc)
                    .query(`
                    select ml.MTRL,ml.VAT,ml.QTY1,f.fincode
                    from mtrlines ml, findoc f
                    where ml.findoc = @findoc and ml.findocs = f. findoc
        `).catch(err => {
                        console.log(err)
                        throw new Error(err);
                    })
                //κλείνω τις εκκρεμότητες του παραστατικού Πρώτα στο findoc
                await getRq()
                    .input('findoc', mssql.Int, findoc)
                    .query(`
                update findoc
                set FULLYTRANSF = 1 , bool01 = 1
                where findoc = @FINDOC
                `).catch(err => {
                        console.log(err);
                        throw new Error(err);
                    })
                //Και μετα τρέχω για κάθε γραμμή
                await getRq()
                    .input('findoc', mssql.Int, findoc)
                    .input('mtrl', mssql.Int, results.recordset[i].MTRL)
                    .input('qty', mssql.Int, results.recordset[i].pos_parag)
                    .query(`
                    update mtrlines
                    set PENDING = 0, QTY1COV = @qty
                    where findoc = @findoc  
                    and mtrl = @mtrl
                    `).catch(err => {
                        console.log(err);
                        throw new Error(err);
                    })
                for (let j = 0; j < grammesParastatikou.recordset.length; j++) {
                    await getRq()
                        .input('findoc', mssql.Int, findoc)
                        .input('mtrl', mssql.Int, grammesParastatikou.recordset[j].MTRL)
                        .input('qty', mssql.Int, grammesParastatikou.recordset[j].QTY1)
                        .query(`
                        update mtrlines
                        set PENDING = 0, QTY1COV = @qty
                        where findoc = @findoc  
                        and mtrl = @mtrl
                        `)
                        .catch(err => {
                            console.log(err);
                            throw new Error(err);
                        })
                }
                console.log('grammesParastatikou', grammesParastatikou.recordset[0].fincode)
                console.log('fiscprd', results.recordset[i].FISCPRD)
                //Παίρνω το SERIESNUM με το query 
                await getRq()
                    .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                    .query(`
                    UPDATE SERIESNUM 
                    SET SERIESNUM=SERIESNUM+1
                    WHERE COMPANY=1001 AND SOSOURCE=7151 AND SERIES=1001 AND FISCPRD = @FISCPRD
                `)
                    .catch(err => {
                        console.log(err)
                        throw new Error(err);
                    })
                let seriesNumResult = await getRq()
                    .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                    .query(`
                    select SERIESNUM
                    from SERIESNUM
                    WHERE COMPANY=1001 AND SOSOURCE=7151 AND SERIES=1001 AND FISCPRD=@FISCPRD
                    
                    `)
                //an de bre apotelesma sto trexon etos tote psaxnoume sto proigoumeno
                if (seriesNumResult.recordset.length == 0) {
                    console.log('SERIES NUM IS UNDEFINED')
                    let yearBefore = +results.recordset[i].FISCPRD
                    yearBefore = yearBefore - 1;
                    seriesNumResult = await getRq()
                        .input('FISCPRD', mssql.Int, yearBefore)
                        .query(`
                    select top 1 SERIESNUM
                    from findoc
                    WHERE COMPANY = 1001 AND SOSOURCE = 7151 AND SERIES = 1001 AND FISCPRD = @FISCPRD
                    ORDER BY SERIESNUM DESC
                        `)
                        .catch(err => {
                            console.log(err)
                            throw new Error(err)
                        })
                }
                let seriesNum = seriesNumResult.recordset[0].SERIESNUM;
                console.log("seriesNum", seriesNumResult.recordset[0])
                // an einai akoma undefined tote den exei dimiourgithei kanena parastiko opote 3ekiname apo to 1
                if (seriesNum == undefined) seriesNum = 0;
                console.log('seriesNum', seriesNum);
                console.log('period', results.recordset[i].PERIOD);
                console.log('date', results.recordset[i].TRNDATE)
                await getRq()
                    .input('TRNDATE', mssql.Date, results.recordset[i].TRNDATE)
                    .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                    .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                    .input('SERIESNUM', mssql.Int, seriesNum + 1)
                    .input('FINCODE', mssql.VarChar, grammesParastatikou.recordset[0].fincode)
                    .query(`
                INSERT INTO FINDOC 
                (COMPANY,SOSOURCE,TRNDATE,FISCPRD,PERIOD,SERIES,SERIESNUM,FPRMS,TFPRMS,FINCODE,BRANCH,SODTYPE,SOCURRENCY) 
                VALUES (1001,7151,@TRNDATE,@FISCPRD,@PERIOD,1001,@SERIESNUM,1001,100,@FINCODE,1000,71,100)
                `)
                    .catch(err => {
                        console.log(err)
                        throw new Error(err);
                    })
                //Τρέχω query για να πάρω το findoc και να το χρησιμοποιήσω στο Import του mtrdoc και mtrlines
                let findocMtrdocMtrlines = await getRq()
                    .input('fiscprd', mssql.Int, results.recordset[i].FISCPRD)
                    .input('fincode', mssql.VarChar, grammesParastatikou.recordset[0].fincode)
                    .query(`
               select findoc
               from findoc
               where company = 1001 and fiscprd = @fiscprd and sosource = 7151 and fincode = @fincode
               `).catch(err => {
                        console.log(err);
                        throw new Error(err);
                    })
                console.log('findocMtrdocMtrlines', findocMtrdocMtrlines.recordset);
                //Περνάω mtrdoc
                await getRq()
                    .input('FINDOC', mssql.Int, findocMtrdocMtrlines.recordset[0].findoc)
                    .input('QTY', mssql.Int, results.recordset[i].pos_parag)
                    .query(`
               INSERT INTO MTRDOC (COMPANY,FINDOC,WHOUSE,QTY,MTRSTS) 
               VALUES (1001 ,@FINDOC,1000,@QTY,-1)
               `).catch(err => {
                        console.log(err);
                        throw new Error(err);
                    })
                //    Περνάω mtrlines
                console.log(grammesParastatikou.recordset);
                /*
                Πρώτα βάζουμε το παραγώμενο.
                FINDOC κοινό απο επάνω
                MTRLINES με τη σειρα
                LINENUM με τη σειρα
                SODTYPE 51
                MTRL	το παραγόμενο το οποίο είναι στο saldoc το πεδίο int01
                SOSOURCE 7151
                MTRTYPE 1 βάζουμε μόνο στο πρώτο τα άλλα τπτ για να δείξουμε οτι είναι παραγόμενο
                QTY1 τη ποσότητα που μας δίνει
                SPCS Βαζουμε 0 και καταλαβαίνει οτι είναι το παραγώμενο
                */
                let j = 1;
                await getRq()
                    .input('FINDOC', mssql.Int, findocMtrdocMtrlines.recordset[0].findoc)
                    .input('MTRLINES', mssql.Int, j)
                    .input('LINENUM', mssql.Int, j)
                    .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                    .input('QTY', mssql.Int, results.recordset[i].pos_parag)
                    .query(`
                    INSERT INTO MTRLINES 
                    (COMPANY,FINDOC,MTRLINES,LINENUM,SODTYPE,MTRL,SOSOURCE,MTRTYPE,WHOUSE,VAT,QTY1,SPCS,PENDING,RESTMODE) 
                    VALUES
                    (1001 ,@FINDOC,@MTRLINES ,@LINENUM ,51 ,@MTRL,7151,1,1000,1410,@QTY,0,1,8) 
                    `)
                //Απο εδώ και πέρα βάζω τα εμπορεύματα που θα αναλωθούν
                for (let k = 0; k < grammesParastatikou.recordset.length; k++) {
                    j++;
                    await getRq()
                        .input('FINDOC', mssql.Int, findocMtrdocMtrlines.recordset[0].findoc)
                        .input('MTRLINES', mssql.Int, j)
                        .input('LINENUM', mssql.Int, j)
                        .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                        .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                        .query(`
                        INSERT INTO MTRLINES (COMPANY,FINDOC,MTRLINES,LINENUM,SODTYPE,MTRL,SOSOURCE,WHOUSE,VAT,QTY1,PENDING,RESTMODE) 
                        VALUES (1001,@FINDOC,@MTRLINES,@LINENUM,51,@MTRL,7151,1000,1410,@QTY1,1,9)
                    `).catch(err => {
                            console.log(err);
                            throw new Error(err);
                        })
                }
                //Τελος καταχωρησης της παραγωγης
                // kleisimo parastatikou
                await getRq()
                    .input('FINDOC', mssql.Int, results.recordset[i].findoc)
                    .query(`
                update findoc
                set bool01 = 1
                where findoc = @FINDOC
                `).catch(err => {
                        console.log(err);
                        throw new Error(err);
                    })
                // paramenei sto telos.
                let category = await getRq()
                    .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                    .query(`
                            select MTRGROUP as category from MTRL where MTRL = @MTRL
                        `).catch(err => {
                        console.log(err)
                        throw new Error(err);
                    })
            //    await insertProductionToDb(category.recordset[0].category, results.recordset[i].findoc, results.recordset[i].paragomeno, grammesParastatikou.recordset[0].fincode, results.recordset[i].TRNDATE, results.recordset[i].pos_parag)
                console.log("DONE");
              //  let production = await getProduction();
                console.log("PRODUCTION");
              //  console.log(production);
                // io.getIO().emit('newProduction', {
                //     action: "New Production",
                //     production: production
                // })

            }

        })
        .catch(err => {
            console.log(err)
            throw new Error(err);
        })

}
// }, 30000)
let getProduction = async () => {
    let results = await database
        .execute('select * from production')
        .catch(err => {
            console.log(err)
            throw new Error(err)
        })
    let production = [];
    for (let i = 0; results[0].length; i++) {
        production[i] = {
            findoc: results[0][i].findoc,
            mtrl: results[0][i].mtrl,
            name: results[0][i].name ? results[0][i].name : 'Άγνωστο',
            date: results[0][i].date ? results[0][i].date : 'Άγνωστο',
            qty: results[0][i].qty ? results[0][i].qty : '0',
            product: results[0][i].paragomeno ? results[0][i].paragomeno : 'Άγνωστο',
            customer: results[0][i].customer ? results[0][i].customer : 'Άγνωστο',
            ingredients: await getIngredients(results[0][i].mtrl),
            category: results[0][i].catId,
            categoryPost: await getCatPostData(results[0][i].catId),
            productionLine: await getprodLineSteps(results[0][i].findoc),
            time: results[0][i].time
        }
        return production;
    }

}

let insertProductionToDb = async (category, findoc, mtrl, name, date, qty) => {
    let paragomeno = await getRq()
        .input('mtrl', mssql.Int, mtrl)
        .query('select NAME from mtrl where mtrl= @mtrl')
    let trdrName = await getRq()
        .input('findoc', mssql.Int, findoc)
        .query(`
        select  t.name as name
        from findoc f left join trdr t
                      on f.trdr = t.trdr
        where f.findoc = @findoc
    `)
    console.log(trdrName.recordset[0].name)
    if (await findocExists(findoc) != true) {
        console.log('inserting to db')
        //insert
        await database.execute('insert into production (findoc,mtrl,catId,name,date,qty,paragomeno,customere) values (?,?,?,?,?,?,?,?)', [findoc, mtrl, category, name, date, qty, paragomeno.recordset[0].NAME, trdrName.recordset[0].name])
            .catch(err => {
                console.log(err)
                throw new Error(err);
            })
    } else {
        console.log('findoc already exists')
        // update
        await database.execute('update production set mtrl=?,catId=?,name=?,date=?,qty=?,paragomeno=?,customere=? where findoc=?', [mtrl, category, name, date, qty, paragomeno.recordset[0].NAME, trdrName.recordset[0].name, findoc])
            .catch(err => {
                console.log(err)
                throw new Error(err);
            })

    }
    await addProdLine(findoc, category);
}

let findocExists = async (findoc) => {
    let find = await database.execute('select * from production where findoc = ?', [findoc])
        .catch(err => {
            console.log(err)
            throw new Error(err);
        })
    if (find[0].length > 0) {
        return true;
    } else {
        return false;
    }
}
// test();


 module.exports = {rq:getRq(),config:config}