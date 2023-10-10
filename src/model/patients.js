const mongoose = require('mongoose')
const validator = require('validator')

const Patient = mongoose.model('Patient', {
    name: {
        required: true,
        type: String,
        trim: true,
    },
    age: {
        type: String,
        default: null
    },
    gender: {
        type: String,
        default: null
    },
    email: {
        default: null,
        type: String,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("please enter correct email")
            }
        },
    },
    phone: {
        default: null,
        type: String,
        trim: true
    },
})


module.exports = Patient
