import { prisma } from './lib/prisma.js'


async function main() {
    /*let user = await prisma.user.upsert({
        where: {
            email: 'alice@prisma.io',
        },
        update: {},
        create: {
            email: 'alice@prisma.io',
            name: 'Alice',
            password: '1234',
            files: {
                create: {
                    filename: 'My Document',
                    content: 'This is my first Doc',
                    type: 'DOCUMENT'
                },
            },
        },
        include: {
            files: true,
        },
    })

    


    console.log("User: ", user)*/



    const allUsers = await prisma.user.findMany({
        include: {
            files: true,
        },
    })
    console.log("All Users: ", JSON.stringify(allUsers, null, 2))
}



main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

  