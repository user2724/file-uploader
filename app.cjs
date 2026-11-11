const express = require("express")
const path = require("node:path")
const app = express()
const bcrypt = require("bcryptjs")
//const session = require("express-session")
const passport = require("passport")
const LocalStrategy = require('passport-local').Strategy
const flash = require('connect-flash')
const cloudinary = require('cloudinary').v2;
const multer = require("multer")
const upload = multer({ dest: 'uploads/'})

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))


require('dotenv/config');

const { body, validationResult } = require("express-validator")

const expressSession = require('express-session');
app.use(express.urlencoded({ extended: false }));

const { PrismaPg } = require('@prisma/adapter-pg');  // For other db adapters, see Prisma docs
const { PrismaClient } = require('./generated/prisma/client');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');

 // DATABASE_URL defined in env file included in prisma.config.js; see Prisma docs
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });



app.use(
  expressSession({
    cookie: {
     maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: 'a santa at nasa',
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});


async function start() {
    const { prisma } = await import("./lib/prisma.js")
    

    app.get("/", async (req, res) => {
        try {
            const users = await prisma.user.findMany();
           
            let files = []
            let folders = []

            if ( req.user) {
                 files = await prisma.file.findMany({
                where: { authorId: req.user.id}            
                 })

                folders = await prisma.folder.findMany({
                    where: { authorId: req.user.id}
            })

            /*if (req.user) {
                 folders = await prisma.folder.findMany({
                    where: { authorId: req.user.id}
                })     
            }*/
        
            console.log(req.user)
        }
            res.render("index.ejs", { files, folders, errorMessage: req.flash('error') })
            //const files = req.user.files
            
        } catch (error) {
            console.error(error)
            res.status(500).send("ERROR LOADING DATA")
        }
    })
const uploadMiddleware = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 8 }])
app.post("/upload-file", upload.single('filename'), async (req, res, next) => {
console.log(req.file.originalname, req.file.size)
res.redirect("/")
})

app.post("/add-file", async (req, res) => {
    const { fileUrl } = req.body
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { 
            files: {
            create: {
                fileUrl: fileUrl,
                filename: fileUrl,
                size: null,
                folder: "main"

            },
            include: {
                files: true,
                folders: true
            }
        } 
    }
    })
    console.log("Updated User: ", user)
    res.redirect("/")
})


app.post("/add-folder", async (req, res) => {
    const { folderName, files } = req.body

    const user = await prisma.user.update({
        where: {id: req.user.id},
        data: {
folders: {
    create: {
        folderName: folderName,
        files: files
    },
}
        },
        include: {
            files: true,
            folders: true
        },
         

    })

    console.log("Updated user: ", user)
    res.redirect("/")
})

    app.get("/sign-up", (req, res) => {
        res.render("sign-up.ejs", {error: null, email: null, name: null})
    })

const nameErr = "must be between 1 and 25 characters."
const alphaErr = "must contain only letters."
const emailErr = "Please provide a valid email address."
const passwordErr = "must be at least 6 characters."


    app.post("/sign-up", [

body("name").trim()
.isLength({ min: 1, max: 25}).withMessage(`Name ${nameErr}`),
body("email")
.isEmail().withMessage(`${emailErr}`),
body("password")
.isLength({min: 6}).withMessage(`Password ${passwordErr}`),
body("confirmPassword")
.custom((value, { req }) => {
        if ( value !== req.body.password) {
            throw new Error("Passwords do not match.")
        }
        return true 
    })

    ], async (req, res) => {

const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).render("sign-up", {
            errors: errors.array(),
            formData: req.body,
            
        })
    }
    
    const { email, name, password, files, folders } = req.body
        const hashedPassword = await bcrypt.hash(password, 10)

        try {
            const user = await prisma.user.create({
                data: {
                    email: email,
                    name: name,
                    password: hashedPassword,
                    files: files,
                    folders: folders
                },
                include: {
                    files: true,
                    folders: true
                }
            })

            console.log("New User: ", user)
            res.redirect("/")
        } catch (error) {
            if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "P2002"
            ) {
                return res.status(409).render("sign-up.ejs", {
                    error: "An account with that email already exists.",
                    name,
                    email
                })
            }

            console.error("Failed to create user:", error)
            res.status(500).send("Unable to create account. Please try again.")
        }
    })

 passport.use(
    new LocalStrategy({usernameField: 'email'}, async (email, password, done) => {
        try {
const user = await prisma.user.findUnique({
    where: { email: email }
})

if (!user) {
    return done(null, false, { message: "Incorrect Email" })
}

const match = await bcrypt.compare(password, user.password)
if (!match) {
    return done(null, false, {message: "Incorrect Password"})
}
return done(null, user)
        } catch (error) {
            return done(error)
        }
    })
 )

 passport.serializeUser((user, done) => {    
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
       const user = await prisma.user.findUnique({
        where: {id: id},
        include: {
            files: true
        }
       })

        done(null, user)
    } catch (err) {
        done(err)
    }
})
    
    app.post("/",
        passport.authenticate("local", {
            successRedirect: "/",
            failureRedirect: "/",
            failureMessage: true,
            failureFlash: true
        })


    )

 app.post("/log-out", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err)
        }
    })
    res.redirect("/")
})   

    const PORT = process.env.PORT || 5000

    app.listen(PORT, (error) => {
        if (error) {
            throw error
        }
        console.log(`App is listening on port ${PORT}!`)
    })
}

start().catch((error) => {
    console.error("Failed to start app:", error)
    process.exitCode = 1
})