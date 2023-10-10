const mongoose = require('mongoose')
const validator = require('validator')

const User = mongoose.model('User', {
    username: {
        required: true,
        type: String,
        trim: true,
    },
    age: {
        required: true,
        type: String,
        default: 0
    },
    password: {
        required: true,
        type: String,
        trim: true,
        minLength: 7,
    },
    gender: {
        required: true,
        type: String,
    },
    email: {
        required: true,
        type: String,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("please enter correct email")
            }
        },
    },
    phone: {
        required: true,
        type: String,
        trim: true
    },
    userType: {
        set: (value) => value.toLowerCase(),
        required: true,
        type: String,
    },
    tokens : [String]
})


module.exports = User
