const mongoose = require('mongoose')
const validator = require('validator')

const Images = mongoose.model('Images', {
    name: {
        type: String,
        trim: true,
        default: null
    },
    path: {
        type: String,
        trim: true,
        default: null
    },
    patientID: {
        type: String,
        default : null
    },
    doctorID: [String],
    

    classified: {
        type: Boolean,
        default: false
    },

    flagged: {
        type: Boolean,
        default: false
    },

    approved: {
        type: Boolean,
        default: false
    },
    
    diagnose: {
        type: String,
        trim: true,
        default: null
    },
    classification: [{
        classification: {
            type: String,
            set: (value) => value.toUpperCase(),
        },
        confidence: String, 
        _id: false
    }],
    object_detection: {
        image_object_detection: {
            type: String,
            default: null
        },
        object_detected: {
            type: String,
            default: null
        },
        bounding_box: [Number],
        confidence: {
            type: String,
            default: null
        },
    },
    segmentation: {
        segmented_image: {
            type: String,
            default: null
        },
        contour_image: {
            type: String,
            default: null
        },
        contour_coords: [[Number]]
    },
    date: {
        type: Date,
        default: null
    }
})

module.exports = Images