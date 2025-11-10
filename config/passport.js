// const passport = require('passport')
// const GoogleStrategy = require('passport-google-oauth20').Strategy
// const User = require('../models/User')
// const { generateToken } = require('../controllers/authController')

// module.exports = function configurePassport() {
//   passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
//   }, async (accessToken, refreshToken, profile, done) => {
//     try {
//       const email = profile.emails && profile.emails[0] && profile.emails[0].value
//       const name = profile.displayName || (profile.name && `${profile.name.givenName} ${profile.name.familyName}`) || 'Google User'

//       if (!email) return done(new Error('Google profile has no email'), null)

//       let user = await User.findOne({ email })
//       if (!user) {
//         // create a random password for local record
//         const randomPass = Math.random().toString(36).slice(-12) + Date.now()
//         user = await User.create({ name, email, password: randomPass })
//       }

//       // Attach a token for client redirect and persist it on the user record
//       const token = generateToken(user._id)
//       try {
//         user.lastToken = token
//         await user.save()
//       } catch (e) {
//         console.warn('Failed to save lastToken for user:', e)
//       }
//       return done(null, { user, token })
//     } catch (err) {
//       return done(err)
//     }
//   }))

//   passport.serializeUser((obj, done) => {
//     // we serialize the minimal info; obj may be { user, token }
//     done(null, obj)
//   })

//   passport.deserializeUser((obj, done) => {
//     done(null, obj)
//   })
// }




const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { generateToken } = require('../controllers/authController');

module.exports = function configurePassport() {
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    'https://algud-server.onrender.com/api/auth/google/callback';

  console.log('🧭 Google OAuth callback URL:', callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0] && profile.emails[0].value;
          const name =
            profile.displayName ||
            (profile.name &&
              `${profile.name.givenName} ${profile.name.familyName}`) ||
            'Google User';

          if (!email) {
            return done(new Error('Google profile has no email'), null);
          }

          let user = await User.findOne({ email });
          if (!user) {
            const randomPass =
              Math.random().toString(36).slice(-12) + Date.now();
            user = await User.create({ name, email, password: randomPass });
          }

          const token = generateToken(user._id);
          user.lastToken = token;
          await user.save();

          return done(null, { user, token });
        } catch (err) {
          console.error('❌ Error in Google OAuth strategy:', err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((obj, done) => {
    done(null, obj);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });
};
