var express = require('express')
var passport = require('passport')
var util = require('util')
var session = require('express-session')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var GitHubStrategy = require('passport-github2').Strategy
var partials = require('express-partials')
var mongoose = require('mongoose')
var students = require('./routes/students')
var Student = require('./models/student')
// var auth = require('./routes/auth')

var GITHUB_CLIENT_ID = "6611d7cd2c014c4a4303";
var GITHUB_CLIENT_SECRET = "2349ab5325c9bd504d4f77a698bfe7af8e6f65ad";

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  Student.findOne({githubId: user.githubId}, function(err,student) {
    done(null, student);
  })
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
     Student.findOne({
         'githubId': profile.id
     }, function(err, student) {
         if (err) {
             return done(err);
         }
         if (!student) {
             student = new Student({
                githubId: profile.id,
                name: profile.displayName,
                cohort: "1606",
                score: 0
             });
             student.save(function(err) {
                 if (err) console.log(err);
                 return done(err, student);
             });
         } else {
          return done(err, student);
         }
     });
 }
));

// Configure express
var app = express()
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(partials());
app.use(session({ secret: 'dinosaurs roar', resave: false, saveUninitialized: false }));
app.use(bodyParser.json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + 'public'))
app.use('/students', ensureAuthenticated, students)
// app.use('/auth', auth)

//Configure DB
var dbName = 'studentDB';
var connectionString = 'mongodb://localhost:27017/' + dbName;
mongoose.connect(connectionString);

app.locals.title = "Race to 1k"


app.get('/', function(req, res){
  const { user } = req
    if(user) {
      Student.findOne({githubId: user.githubId}, function(err, student) {
        res.redirect('/students/account', { student });
      })
    }
    res.render('index', { student: null });
});

app.get('/login', function(req, res){
  const { user } = req
    if(user) {
      Student.findOne({githubId: user.githubId}, function(err, student) {
        res.redirect('/students/account', { student });
      })
    }
    res.render('login', { student: null });
});

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'student:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/students/points');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

var port_number = process.env.PORT || 3000

app.listen(port_number, () => {
  console.log(`${app.locals.title} is running on ${port_number}.`);
});

module.exports = app
