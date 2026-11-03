const express = require("express")
const path = require("node:path")
const app = express()
const bcrypt = require("bcryptjs")

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.urlencoded({ extended: false }));

async function start() {
    const { prisma } = await import("./lib/prisma.js")
    

    app.get("/", async (req, res) => {
        try {
            const users = await prisma.user.findMany();
            res.render("index.ejs", { users })
        } catch (error) {
            console.error(error)
            res.status(500).send("ERROR LOADING DATA")
        }
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