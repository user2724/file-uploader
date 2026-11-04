const express = require("express")
const path = require("node:path")
const app = express()
const bcrypt = require("bcryptjs")
//const session = require("express-session")
const passport = require("passport")
const LocalStrategy = require('passport-local').Strategy
const flash = require('connect-flash')


app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))


require('dotenv/config');



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
            res.render("index.ejs", { users, errorMessage: req.flash('error') })
        } catch (error) {
            console.error(error)
            res.status(500).send("ERROR LOADING DATA")
        }
    })
// File creation draft: (Not final code)
app.post("/add-file", async (req, res) => {
    const { filename } = req.body
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { 
            files: {
            create: {
                filename: filename,
                content: null,
                type: 'DOCUMENT' // At least for now
            }
        } 
    },
        include: {
            files: true
        }
       
    })
    console.log("Updated User: ", user)
    res.redirect("/")
})


    app.get("/sign-up", (req, res) => {
        res.render("sign-up.ejs", {error: null, email: null, name: null})
    })

    app.post("/sign-up", async (req, res) => {
        const { email, name, password, files } = req.body
        const hashedPassword = await bcrypt.hash(password, 10)

        try {
            const user = await prisma.user.create({
                data: {
                    email: email,
                    name: name,
                    password: hashedPassword,
                    files: files
                },
                include: {
                    files: true
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
        where: {id: id}
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