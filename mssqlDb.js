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
                    .input('QTY1', mssql.Int, results.recordset[i].pos_parag)
                    .query(`
                        INSERT INTO MTRLINES (COMPANY,FINDOC,MTRLINES,LINENUM,SODTYPE,MTRL,SOSOURCE,MTRTYPE,WHOUSE,VAT,QTY1,SPCS) 
                        VALUES (1001 ,@FINDOC,@MTRLINES ,@LINENUM ,51 ,@MTRL,7151,1,1000,1410,@QTY1,0)
                        `)
                    .catch(err => {
                        console.log(err);
                        throw new Error(err);
                    })
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
                    INSERT INTO MTRLINES (COMPANY,FINDOC,MTRLINES,LINENUM,SODTYPE,MTRL,SOSOURCE,WHOUSE,VAT,QTY1) 
                    VALUES (1001,@FINDOC,@MTRLINES,@LINENUM,51,@MTRL,7151,1000,1410,@QTY1)
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
                //                 //MTRTRN
                //                 // Αλλάζω τη κατάσταση της παραγωγής σε Completed
                //                 await getRq()
                //                     .input('findoc', mssql.Int, findocMtrdocMtrlines.recordset[0].findoc)
                //                     .query('update MTRDOC set MTRSTS = 1 where findoc = @findoc')
                //                     .catch(err => {
                //                         console.log(err);
                //                         throw new Error(err);
                //                     })
                //                 //Τρέχω το query(Πάντα το πρώτο είναι το παραγόμενο)
                //                 await getRq()
                //                     .input('FINDOC', mssql.Int, findocMtrdocMtrlines.recordset[0].findoc)
                //                     .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                     .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                     .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                     .input('TRNDATE', mssql.Date, results.recordset[i].TRNDATE)
                //                     .input('FINCODE', mssql.VarChar, results.recordset[i].FINCODE)
                //                     .input('QTY1', mssql.Int, results.recordset[i].pos_parag)
                //                     .query(`
                //                     INSERT INTO MTRTRN (COMPANY,FINDOC,MTRTRN,LINENUM,FISCPRD,PERIOD,BRANCH,SODTYPE,MTRL,MTRTYPE,SOSOURCE,SOREDIR,FPRMS,TPRMS,SERIES,TRNDATE,FINCODE,SOCURRENCY,WHOUSE,QTY1,VAT) 
                //                     VALUES (1001 ,@FINDOC ,1 ,1 ,@FISCPRD ,@PERIOD ,1000 ,51 ,@MTRL ,1 ,7151 ,0 ,1001 ,1001 ,1001 ,@TRNDATE ,@FINCODE ,100 ,1000 ,@QTY1 ,1410)
                //                     `).catch(err => {
                //                         console.log(err)
                //                         throw new Error(err);
                //                     })
                //                 //Τρέχω το query για τα εμπορεύματα που θα αναλωθούν
                //                 for (let k = 0; k < grammesParastatikou.recordset.length; k++) {
                //                     await getRq()
                //                         .input('FINDOC', mssql.Int, findocMtrdocMtrlines.recordset[0].findoc)
                //                         .input('MTRTRN', mssql.Int, k + 2)
                //                         .input('LINENUM', mssql.Int, k + 2)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                         .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                         .input('TRNDATE', mssql.Date, results.recordset[i].TRNDATE)
                //                         .input('FINCODE', mssql.VarChar, results.recordset[i].FINCODE)
                //                         .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                         .query(`
                //                     INSERT INTO MTRTRN (COMPANY,FINDOC,MTRTRN,LINENUM,FISCPRD,PERIOD,BRANCH,SODTYPE,MTRL,MTRTYPE,SOSOURCE,SOREDIR,FPRMS,TPRMS,SERIES,TRNDATE,FINCODE,SOCURRENCY,WHOUSE,QTY1,VAT) 
                //                     VALUES (1001 ,@FINDOC ,@MTRTRN ,@LINENUM ,@FISCPRD ,@PERIOD ,1000 ,51 ,@MTRL ,0 ,7151 ,0 ,1001 ,1003 ,1001 ,@TRNDATE ,@FINCODE ,100 ,1000 ,@QTY1 ,1410)
                //                     `)
                //                         .catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }

                //                 //MTRBALSHEET
                //                 /*
                //                 MTRBALSHEET δείχνει γενικός τις κινήσεις του είδους ανά μήνα έτους και για πιο
                //                 λόγο μετακινήθηκε (μάλλον)Για την πρώτη γραμμή που είναι το παραγόμενο τρέχω 
                //                 query για να δω αν έχει γίνει καταχώριση στο πίνακα και αν χρειαστεί insert ή update 
                //                 Τσεκαρω fiscprd, period(μήνας),whouse, και mtrl (στην ουσία βλεπω αν έχει κινηθεί μέσα 
                //                 στο μήνα του έτους το συγκεκριμένο είδος)
                //                 */
                //                 let mtrbalsheet = await getRq()
                //                     .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                     .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                     .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                     .query(`
                //                     select COMPANY,FISCPRD,PERIOD,MTRL,WHOUSE,IMPQTY1,PROQTY
                //                     from MTRBALSHEET
                //                     where company = 1001 and fiscprd = @FISCPRD and period = @PERIOD and whouse = 1000 and mtrl = @MTRL
                //                     `).catch(err => {
                //                         console.log(err)
                //                         throw new Error(err);
                //                     })
                //                 /*Αν βρω εγγραφή προσθέτω τη ποσότητα που βρήκα στο query με τη ποσότητα που
                //                  θέλω να περάσω και κάνω update το IMPQTY1 και το PROQTY με αυτό το νούμερο*/
                //                 if (mtrbalsheet.recordset.length > 0) {
                //                     await getRq()
                //                         .input('QTY', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('fiscprd', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('period', mssql.Int, results.recordset[i].PERIOD)
                //                         .input('mtrl', mssql.Int, results.recordset[i].paragomeno)
                //                         .query(`
                //                     update MTRBALSHEET
                //                     set IMPQTY1 = IMPQTY1 + @QTY ,PROQTY = PROQTY + @QTY
                //                     where company = 1001 and fiscprd = @fiscprd and period = @period 
                //                     and whouse = 1000 and mtrl = @mtrl
                //                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 //Αν δεν έχω βρεί εγγραφή απλά κάνω insert τη ποσότητα μου με το query
                //                 else {
                //                     await getRq()
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                         .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('PROQTY', mssql.Int, results.recordset[i].pos_parag)
                //                         .query(`
                //                     INSERT INTO MTRBALSHEET (COMPANY,FISCPRD,PERIOD,MTRL,WHOUSE,IMPQTY1,PROQTY) 
                // 	                VALUES (1001 ,@FISCPRD ,@PERIOD ,@MTRL ,1000 ,@IMPQTY1 ,@PROQTY)
                //                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 /*Το ίδιο ισχύει και για τις επόμενες γραμμές που είναι τα αναλώσιμα 
                //         με τη διαφορά οτι χρησιμοποιώ άλλα πεδία του πίνακα.
                //         Τσεκαρω fiscprd, period(μήνας), και mtrl
                //         (στην ουσία βλεπω αν έχει κινηθεί μέσα στο μήνα του έτους το συγκεκριμένο είδος)
                //          */


                //                 for (let k = 0; k < grammesParastatikou.recordset.length; k++) {

                //                     let mtrbalsheetParagomeno = await getRq()
                //                         .input('fiscprd', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('period', mssql.Int, results.recordset[i].PERIOD)
                //                         .input('mtrl', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                         .query(`
                //                     select COMPANY,FISCPRD,PERIOD,MTRL,WHOUSE,EXPQTY1,CONQTY
                //                     from MTRBALSHEET
                //                     where company = 1001 and fiscprd = @fiscprd and period = @period and whouse = 1000 and mtrl = @mtrl                
                //                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                     console.log(mtrbalsheetParagomeno.recordset)
                //                     /*	Αν βρω εγγραφή προσθέτω τη ποσότητα που βρήκα στο query 
                //                     με τη ποσότητα που θέλω 
                //                     να περάσω και κάνω update το IMPQTY1 και το PROQTY με αυτό το νούμερο*/
                //                     if (mtrbalsheetParagomeno.recordset.length > 0) {
                //                         await getRq()
                //                             .input('qty', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('fiscprd', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('period', mssql.Int, results.recordset[i].PERIOD)
                //                             .input('mtrl', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .query(`
                //                         update MTRBALSHEET
                //                         set EXPQTY1 = EXPQTY1 + @qty ,CONQTY = CONQTY + @qty
                //                         where company = 1001 and fiscprd = @fiscprd and period = @period 
                //                         and whouse = 1000 and mtrl = @mtrl
                //                         `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })

                //                     }
                //                     //	Αν δεν έχω βρεί εγγραφή απλά κάνω insert τη ποσότητα μου με το query
                //                     else {
                //                         await getRq()
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                             .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('CONQTY', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .query(`
                //                         INSERT INTO MTRBALSHEET (COMPANY,FISCPRD,PERIOD,MTRL,WHOUSE,EXPQTY1,CONQTY) 
                // 	                    VALUES (1001 ,@FISCPRD ,@PERIOD ,@MTRL ,1000 ,@EXPQTY1 ,@CONQTY)
                //                         `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     }

                //                 }
                //                 //MTRFINDATA
                //                 /*
                //                 MTRFINDATA υπάρχει για μέτρηση κινήσεων στο έτος
                //                 Οπότε ακολουθώ την ίδια διαδικασία με πριν με τη μόνη διαφορά οτι στο QTY1 
                //                 όταν η γραμμή αναλώνει μπαίνει με αρνητικό πρόσιμο, άρα όταν κάνω update η 
                //                 πράξη είναι αντίστοιχη.
                //                 Για την πρώτη γραμμή που είναι το παραγόμενο τρέχω query για να δω αν έχει 
                //                 γίνει καταχώριση στο πίνακα και αν χρειαστεί insert ή update 
                //                 */
                //                 let mtrfindata = await getRq()
                //                     .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                     .input('mtrl', mssql.Int, results.recordset[i].paragomeno)
                //                     .query(`
                //                                 select COMPANY,FISCPRD,MTRL,WHOUSE,IMPQTY1,QTY1
                //                                 from mtrfindata
                //                                 where company = 1001 and FISCPRD = @FISCPRD and whouse = 1000 and mtrl = @mtrl
                //                                 `).catch(err => {
                //                         console.log(err)
                //                         throw new Error(err);
                //                     })
                //                 /*	Αν βρω εγγραφή προσθέτω τη ποσότητα που βρήκα στο query με τη ποσότητα 
                //                 που θέλω να περάσω και κάνω update το IMPQTY1 και το QTY1 με αυτό το νούμερο
                //                 */
                //                 if (mtrfindata.recordset.length > 0) {
                //                     await getRq()
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('QTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('mtrl', mssql.Int, results.recordset[i].paragomeno)
                //                         .query(`
                //                                     update MTRFINDATA
                //                                     set IMPQTY1 = IMPQTY1 + @IMPQTY1 ,QTY1 = QTY1 + @QTY1
                //                                     where company = 1001 and fiscprd = @FISCPRD 
                //                                     and whouse = 1000 and mtrl = @mtrl                
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 //Αν δεν έχω βρεί εγγραφή απλά κάνω insert τη ποσότητα μου με το query
                //                 else {
                //                     await getRq()
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('QTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .query(`
                //                                     INSERT INTO MTRFINDATA (COMPANY,FISCPRD,MTRL,WHOUSE,IMPQTY1,QTY1) 
                //                                     VALUES(1001,@FISCPRD,@MTRL,1000,@IMPQTY1,@QTY1)
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 /*Το ίδιο ισχύει και για τις επόμενες γραμμές που είναι τα αναλώσιμα 
                //                 με τη διαφορά οτι χρησιμοποιώ άλλα πεδία του πίνακα και το qty παίρνει αφαίρεση.
                //                 Τσεκαρω fiscprd,whouse και mtrl (στην ουσία βλεπω αν έχει κινηθεί 
                //                 μέσα στο μήνα του έτους το συγκεκριμένο είδος)*/
                //                 for (let k = 0; k < grammesParastatikou.recordset.length; k++) {
                //                     let mtrfindataanalosima = await getRq()
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('mtrl', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                         .query(`
                //                                     select COMPANY,FISCPRD,MTRL,WHOUSE,EXPQTY1,QTY1
                //                                     from mtrfindata
                //                                     where company = 1001 and FISCPRD = @FISCPRD and whouse = 1000 and mtrl = @mtrl 
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                     /*	Αν βρω εγγραφή προσθέτω τη ποσότητα που βρήκα στο query με τη 
                //                     ποσότητα που θέλω να περάσω και κάνω update το IMPQTY1 και το PROQTY 
                //                     με αυτό το νούμερο
                // */
                //                     if (mtrfindataanalosima.recordset.length > 0) {
                //                         await getRq()
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('mtrl', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .query(`
                //                                         update MTRFINDATA
                //                                         set EXPQTY1 = EXPQTY1 + @EXPQTY1,QTY1 = QTY1 - @QTY1
                //                                         where company = 1001 and fiscprd = @FISCPRD and whouse = 1000 and mtrl = @mtrl
                //                                         `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     }
                //                     //	Αν δεν έχω βρεί εγγραφή απλά κάνω insert τη ποσότητα μου με το query

                //                     else {
                //                         await getRq()
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('mtrl', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1 * (-1))
                //                             .query(`
                //                                         INSERT INTO MTRFINDATA (COMPANY,FISCPRD,MTRL,WHOUSE,EXPQTY1,QTY1) 
                //                                         VALUES(1001,@FISCPRD,@mtrl,1000,@EXPQTY1,@QTY1)                    
                //                                         `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     }

                //                 }

                //                 //MTRDATA
                //                 /* Aκολουθώ την ίδια διαδικασία, στο QTY1 όταν η γραμμή αναλώνει 
                //                 μπαίνει με αρνητικό πρόσιμο, άρα όταν κάνω update η πράξη είναι 
                //                 αντίστοιχη */
                //                 let mtrData = await getRq()
                //                     .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                     .input('mtrl', mssql.Int, results.recordset[i].paragomeno)
                //                     .query(`
                //                                 select COMPANY,MTRL,FISCPRD,IMPQTY1,QTY1
                //                                 from mtrdata
                //                                 where company = 1001 and fiscprd = @FISCPRD and mtrl = @mtrl

                //                                 `)
                //                     .catch(err => {
                //                         console.log(err)
                //                         throw new Error(err);
                //                     })
                //                 if (mtrData.recordset.length > 0) {
                //                     //  αν έχω κάνω update
                //                     await getRq()
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('MTLR', mssql.Int, results.recordset[i].paragomeno)
                //                         .query(`
                //                                     update MTRDATA
                //                                     set IMPQTY1 = IMPQTY1 + @IMPQTY1 , QTY1 = QTY1 + @IMPQTY1
                //                                     where company = 1001 and fiscprd = @FISCPRD and mtrl = @MTLR                
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 //	αν δεν έχω κάνω insert
                //                 else {
                //                     await getRq()
                //                         .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('QTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .query(`
                //                                     INSERT INTO MTRDATA (COMPANY,MTRL,FISCPRD,IMPQTY1,QTY1) 
                //                                     VALUES (1001,@MTRL,@FISCPRD,@IMPQTY1,@QTY1)
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 /*Εδώ είναι τα αναλώσιμα και χρησιμοποιώ το EXPQTY1 αντί για το IMPQTY1
                //                 Τσεκάρω αν έχω γραμμή*/
                //                 for (let k = 0; k < grammesParastatikou.recordset.length; k++) {
                //                     let mtrDataAnalosima = await getRq()
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('mtrl', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                         .query(`
                //                                     select COMPANY,MTRL,FISCPRD,EXPQTY1,QTY1
                //                                     from mtrdata
                //                                     where company = 1001 and fiscprd = @FISCPRD and mtrl = @mtrl
                //                                     `)
                //                         .catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                     if (mtrDataAnalosima.recordset.length > 0) {
                //                         //  αν έχω κάνω update
                //                         await getRq()
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1 * (-1))
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('MTLR', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .query(`
                //                                             update MTRDATA
                //                                             set EXPQTY1 = EXPQTY1 + @EXPQTY1 , QTY1 = QTY1+ @QTY1
                //                                             where company = 1001 and fiscprd = @FISCPRD and mtrl = @MTLR                
                //                                             `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     } else {
                //                         // αν δεν έχω κάνω insert
                //                         await getRq()
                //                             .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1 * (-1))
                //                             .query(`
                //                                         INSERT INTO MTRDATA (COMPANY,MTRL,FISCPRD,EXPQTY1,QTY1) 
                //                                         VALUES (1001,@MTRL,@FISCPRD,@EXPQTY1,@QTY1)
                //                                         `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     }

                //                 }
                //                 //MTREXTDATA
                //                 /*Aκολουθώ την ίδια διαδικασία, στο QTY1 όταν η γραμμή αναλώνει 
                //                 μπαίνει με αρνητικό πρόσιμο, άρα όταν κάνω update η πράξη είναι αντίστοιχη
                //                 Εδώ είναι η πρώτη γραμμή που είναι το παραγόμενο
                //                 Τσεκάρω αν έχω γραμμή*/
                //                 let mtrextdata = await getRq()
                //                     .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                     .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                     .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                     .query(`
                //                                     select COMPANY,MTRL,FISCPRD,PERIOD,WHOUSE,IMPQTY1,QTY1
                //                                     from MTREXTDATA
                //                                     where COMPANY = 1001 and MTRL = @MTRL and FISCPRD = @FISCPRD and PERIOD = @PERIOD and WHOUSE = 1000 and SALESMAN = 0
                //                                     `).catch(err => {
                //                         console.log(err)
                //                         throw new Error(err);
                //                     })
                //                 if (mtrextdata.recordset.length > 0) {
                //                     // αν έχω κάνω update
                //                     await getRq()
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                         .query(`
                //                                         UPDATE MTREXTDATA
                //                                         SET IMPQTY1 = IMPQTY1 + @IMPQTY1, QTY1 = QTY1 + @IMPQTY1
                //                                         where COMPANY = 1001 and MTRL = @MTRL and FISCPRD = @FISCPRD and PERIOD = @PERIOD and WHOUSE = 1000 and SALESMAN = 0                    
                //                                         `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 } else {
                //                     //	αν δεν έχω κάνω insert
                //                     await getRq()
                //                         .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                         .input('IMPQTY1', mssql.Int, results.recordset[i].pos_parag)
                //                         .query(`
                //                                     INSERT INTO MTREXTDATA (COMPANY,MTRL,FISCPRD,PERIOD,WHOUSE,IMPQTY1,QTY1,SALESMAN) 
                //                                     VALUES(1001,@MTRL,@FISCPRD,@PERIOD,1000,@IMPQTY1,@IMPQTY1,0)                
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                 }
                //                 /*Εδώ είναι τα αναλώσιμα και χρησιμοποιώ το EXPQTY1 αντί για το IMPQTY1
                //                 Τσεκάρω αν έχω γραμμή */
                //                 for (let k = 0; k < grammesParastatikou.recordset.length; k++) {
                //                     let mtrextdataAnalosima = await getRq()
                //                         .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                         .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                         .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                         .query(`
                //                                     select COMPANY,MTRL,FISCPRD,PERIOD,WHOUSE,IMPQTY1,QTY1
                //                                     from MTREXTDATA
                //                                     where COMPANY = 1001 and MTRL = @MTRL and FISCPRD = @FISCPRD and 
                //                                     PERIOD = @PERIOD and WHOUSE = 1000 and SALESMAN = 0
                //                                     `).catch(err => {
                //                             console.log(err)
                //                             throw new Error(err);
                //                         })
                //                     if (mtrextdataAnalosima.recordset.length > 0) {
                //                         // αν έχω κάνω update
                //                         await getRq()
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                             .query(`	
                //                                         UPDATE MTREXTDATA
                //                                         SET EXPQTY1 = EXPQTY1 + @EXPQTY1, QTY1 = QTY1 - @EXPQTY1
                //                                         where COMPANY = 1001 and MTRL = @MTRL and FISCPRD = @FISCPRD and 
                //                                         PERIOD = @PERIOD and WHOUSE = 1000 and SALESMAN = 0
                //                                     `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     } else {
                //                         //	αν δεν έχω κάνω insert
                //                         await getRq()
                //                             .input('MTRL', mssql.Int, grammesParastatikou.recordset[k].MTRL)
                //                             .input('FISCPRD', mssql.Int, results.recordset[i].FISCPRD)
                //                             .input('PERIOD', mssql.Int, results.recordset[i].PERIOD)
                //                             .input('EXPQTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1)
                //                             .input('QTY1', mssql.Int, grammesParastatikou.recordset[k].QTY1 * (-1))
                //                             .query(`
                //                                         INSERT INTO MTREXTDATA (COMPANY,MTRL,FISCPRD,PERIOD,WHOUSE,EXPQTY1,QTY1) 
                //                                         VALUES(1001,@MTRL,@FISCPRD,@PERIOD,1000,@EXPQTY1,@QTY1)                    
                //                                         `).catch(err => {
                //                                 console.log(err)
                //                                 throw new Error(err);
                //                             })
                //                     }

                //                 }
                // paramenei sto telos.
                let category = await getRq()
                    .input('MTRL', mssql.Int, results.recordset[i].paragomeno)
                    .query(`
                                    select MTRGROUP as category from MTRL where MTRL = @MTRL
                                `).catch(err => {
                        console.log(err)
                        throw new Error(err);
                    })
                await insertProductionToDb(category.recordset[0].category, results.recordset[i].findoc, results.recordset[i].paragomeno, grammesParastatikou.recordset[0].fincode, results.recordset[i].TRNDATE, results.recordset[i].pos_parag)
                console.log("DONE");
                let production = await getProduction();
                console.log("PRODUCTION");
                console.log(production);
                io.getIO().emit('newProduction', {
                    action: "New Production",
                    production: production
                })

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