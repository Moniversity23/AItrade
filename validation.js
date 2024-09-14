// validation.js
const { body, validationResult } = require('express-validator');

// Validation rules for updating profile
exports.updateProfileValidation = [
    body('username')
        .isLength({ min: 1 }).withMessage('Username is required.')
        .isAlphanumeric().withMessage('Username must be alphanumeric.'),
    
    body('email')
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(), // Sanitizes email
     
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
        .matches(/[0-9]/).withMessage('Password must contain at least one number.')
        .matches(/[\W_]/).withMessage('Password must contain at least one special character.')
];

// Function to handle validation errors
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
