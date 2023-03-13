var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
var qs = require('querystring');
var { Strategy } = require('passport-openidconnect');
const axios = require('axios');
var jwt_decode = require('jwt-decode');

// Source and import environment variables
require('dotenv').config({ path: '.okta.env' })
const { ORG_URL, WELL_KNOWN_ENDPOINT, CLIENT_ID, CLIENT_SECRET } = process.env;

var indexRouter = require('./routes/index');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: 'CanYouLookTheOtherWay',
  resave: false,
  saveUninitialized: true
}));

// Setup static file share as well as client side JS
app.use(express.static('public'));
app.use('/support', express.static(path.resolve(__dirname + '/support')));


// Setup Okta authentication
app.use(passport.initialize());
app.use(passport.session());

// https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationRequest
let logout_url, id_token, am_token, decoded_am_token, decoded_id_token, decoded_am_token2;
let _base = WELL_KNOWN_ENDPOINT.slice(-1) == '/' ? WELL_KNOWN_ENDPOINT.slice(0, -1) : WELL_KNOWN_ENDPOINT;
axios
  .get(`${_base}`)
  .then(res => {
    if (res.status == 200) {
      let { issuer, authorization_endpoint, token_endpoint, userinfo_endpoint, end_session_endpoint } = res.data;
      logout_url = end_session_endpoint;

      // Set up passport
      passport.use('oidc', new Strategy({
        issuer,
        authorizationURL: authorization_endpoint,
        tokenURL: token_endpoint,
        userInfoURL: userinfo_endpoint,
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: 'YOUR_UI_APP_URL_HERE/authorization-code/callback',
        scope: 'profile offline_access phone',
      }, (issuer, profile, context, idToken, accessToken, refreshToken, params, done) => {
        console.log(`OIDC response: ${JSON.stringify({
          issuer, profile, context, idToken,
          accessToken, refreshToken, params
        }, null, 2)}\n*****`);
        id_token = idToken;
        am_token = accessToken;
        decoded_am_token = JSON.stringify(jwt_decode(am_token), null, 4);
        decoded_id_token = JSON.stringify(jwt_decode(id_token), null, 4);
        return done(null, profile);
      }));
    }
    else {
      console.log(`Unable to reach the well-known endpoint. Are you sure that the ORG_URL you provided (${ORG_URL}) is correct?`);
    }
  })
  .catch(error => {
    console.error(error);
  });


passport.serializeUser((user, next) => {
  next(null, user);
});

passport.deserializeUser((obj, next) => {
  next(null, obj);
});

function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login')
}


//
// Add endpoints


app.use('/', indexRouter);

app.use('/login', passport.authenticate('oidc'));

app.use('/authorization-code/callback',
  passport.authenticate('oidc', { failureMessage: true, failWithError: true }),
  (req, res) => {
    res.redirect('/profile');
  }
);


// Add page to review basic profile data and JWT tokens
app.use('/profile', ensureLoggedIn, (req, res) => {
  res.render('profile', { authenticated: req.isAuthenticated(), user: req.user, idtoken: decoded_id_token, amtoken: decoded_am_token });
});


// Add endpoint to test api calls
app.use('/apis', ensureLoggedIn, (req, res) => {
  res.cookie('token', am_token);
  res.render('apis', { authenticated: req.isAuthenticated(), user: req.user, idtoken: id_token, amtoken: am_token });
});


// Add logout endpoint
app.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) { return next(err); }
    let params = {
      id_token_hint: id_token,
      // Update logout URI to match your UI Application project URI *********
      post_logout_redirect_uri: 'YOUR_UI_APP_URL_HERE'
    }
    res.redirect(logout_url + '?' + qs.stringify(params));
  });
});

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message + (err.code && ' (' + err.code + ')' || '') +
    (req.session.messages && ": " + req.session.messages.join("\n. ") || '');
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
