const User = require('../models/user')
const Company = require('../models/company')
const {
    singupVerificationMail,
    singupVerifiedMail,
    forgotPasswordMail,
    resetPasswordConfirmationMail } = require('../helper/mail')

const signup = async (req, res) => {
    try {
        let userExists = await User.findOne({email: req.body.email});

        if(userExists && userExists._id) {
            res.status(400).send({error: `User with ${req.body.email} is already exists.`});
        }

        const user = new User(req.body)
        await user.save()
        const token = await user.generateAuthToken()

        //company company.save()
        const company = new Company({ userId: user._id })
        company.save()

        // send email
        singupVerificationMail(user, token)
        res.status(201).json({ user, token })     
    } catch (error) {
        console.log(error)
        res.status(400).send({error: 'Something went wrong. Please contact to administrator.'})
    }
}

const activateAccount = async (req, res) => {
    try {
        let user = req.user
        if(!user) {
            return res.status(400).send({error: 'Invalid activation link.'})
        }

        await user.save()

        // send email
        singupVerifiedMail(user)

        res.send({success: true})
    } catch (e) {
        res.status(400).send({error: 'Invalid link'})
    }
}

const signin = async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        await user.updateLastLogin();
        const token = await user.generateAuthToken()

        res.send({isSignedIn:true, user, token })
    } catch (e) {
        res.status(400).send({isSignedIn: false, error: e.message})
    }
}

const signout = async (req, res) => {
    console.log(req.user)
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send()
    }
}

const signoutAll = async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
}

const recover = async (req, res) => {
    User.findOne({email: req.body.email})
        .then(user => {
            if (!user) {
                return res.status(401).json({success: false, message: 'The email address ' + req.body.email + ' is not associated with any account. Double-check your email address and try again.'})
            }

            //Generate and set password reset token
            user.generatePasswordReset();

            // Save the updated user object
            user.save()
                .then(user => {
                    // send email
                    forgotPasswordMail(user)
                    return res.status(200).json({success: true, message: 'A reset email has been sent to ' + user.email + '.'})
                })
                .catch(err => res.status(500).json({success: false, message: err.message}));
        })
        .catch(err => res.status(500).json({success: false, message: err.message}));
}

const reset = (req, res) => {
    User.findOne({
        resetPasswordToken: req.params.token, 
        // resetPasswordExpires: {$gt: Date.now()}
        resetPasswordExpires: {$gt: new Date()}
    })
        .then((user) => {
            if (!user) return res.status(401).json({success: false, message: 'Password reset token is invalid or has expired.'});

            //Redirect user to form with the email address
            res.status(200).json({success: true, user});
        })
        .catch(err => res.status(500).json({success: false, message: err.message}));
};

const resetPassword = (req, res) => {
    // User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}})
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: new Date()}})
        .then((user) => {
            if (!user) return res.status(401).json({success: false, message: 'Password reset token is invalid or has expired.'});

            //Set the new password
            user.password = req.body.password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            // Save
            user.save((err) => {
                if (err) return res.status(500).json({success: false, message: err.message});

                resetPasswordConfirmationMail(user)
                return res.status(200).json({success: true, message: 'Your password has been updated.'});
            });
        });
};

module.exports = {
    signup,
    activateAccount,
    signin,
    signout,
    signoutAll,
    recover,
    reset,
    resetPassword
}