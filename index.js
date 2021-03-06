const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const bodyParser = require('body-parser')
const cors = require('cors')
const expressValidator = require('express-validator')
const path = require('path')

require('dotenv').config()

//db
require('./db/mongoose')

//import routes
const auth = require('./routes/auth')
const userRoutes = require('./routes/user')
const companyRoutes = require('./routes/company')
const categoryRoutes = require('./routes/category')
const productRoutes = require('./routes/product')
const orderRoutes = require('./routes/order')
const contactRoutes = require('./routes/contact')
const chatRoutes = require('./routes/chat')


// const categoryRoutes = require('./routes/category')
// const productRoutes = require('./routes/product')

//app
const app = express()

//middlewares
app.use(bodyParser.json())
app.use(expressValidator());
app.use(cors());

// console.log(path.join(__dirname, 'public'))
app.use(express.static(path.join(__dirname, 'public')));


//routes middleware
app.use(auth)
app.use(userRoutes)
app.use(companyRoutes)
app.use(categoryRoutes)
app.use(productRoutes)
app.use(orderRoutes)
app.use(contactRoutes)
app.use(chatRoutes)


// app.use(categoryRoutes)
// app.use(productRoutes)

const PORT = process.env.PORT || 8000;

//socket configuration
const server = http.createServer(app)
const io = socketio(server)

const Chat = require('./models/chat')
const User = require('./models/user')

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', (data, callback) => {
        console.log(data)
        socket.join(data._id)
    })

    socket.on('sendMessage', (message, callback) => {
        // const user = getUser(socket.id)
        // io.to(user.room).emit('message', generateMessage(user.username, message))

        const chat = new Chat(message);
        chat.save()
            .then( data => {
                User.udpateChatUsers(message.from, message.to).then(user => {
                    console.log('Chat user updated.')
                })

                // io.emit('message', generateMessage('User', message.message))
                // io.to(socket.id).emit('message', chat)
                Chat.getMessagesByUsers(message.from, message.to).then(messages => {
                    // io.emit('message', messages)
                    // io.to(socket.id).emit('message', message)

                    io.sockets.in(message.to).emit('message', messages);
                    // io.sockets.in(message.to).emit('message', messages);
                    callback(null, messages)
                });
            })
            .catch(error => {
                callback('Error in saving chat.')
            })
    })

    socket.on('disconnect', () => {
        console.log('connection closed')
    })
})


server.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})