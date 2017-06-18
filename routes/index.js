var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
mongoose.connect('localhost:27017/test');
var Schema = mongoose.Schema;
var firebase = require('firebase').initializeApp({
  serviceAccount: "./Contacts-9f95a25dc4ea.json",
  databaseURL: "https://contacts-a76f7.firebaseio.com/"
});

var addressBookSchema = new Schema({
  name: {type: String, required: true}
}, {collection: 'address-book'});

var AddressBookUser = mongoose.model('AddressBookUser', addressBookSchema);

// GET all users.
router.get('/', function(req, res, next) {
  res.redirect('/users');
});

// GET all users
router.get('/users', function(req, res, next) {
  AddressBookUser.find()
      .then(function(users) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(users, null, 3));
      });
});

// CREATE a new User
router.post('/users', function(req, res, next) {
  var addressBookUser = new AddressBookUser({name: req.body.name});
  res.setHeader('Content-Type', 'application/json');
  addressBookUser.save(function(err, user_Saved){
    if(err){
        res.send(JSON.stringify({message: err.message}, null, 3));
    }else{
        res.send(JSON.stringify({message: "User Created : "+ user_Saved.name}, null, 3));
    }
  });
});

// DELETE an existing User and his contacts
router.delete('/users/:id', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  AddressBookUser.findById(req.params.id, function(err, user_load){
    if(user_load == undefined || err != null){
      res.send(JSON.stringify({message: "Unable to find user " + req.params.id}, null, 3));
    }else{
      var contactRef =  firebase.database().ref('address-book').child(req.params.id);
      contactRef.once("child_removed", function(deleted_contacts) {
        var deletedContacts = deleted_contacts.getChildrenCount();
        console.log(deletedContacts+" deleted contacts for " + user_load.name );
      });
      user_load.remove(function(error) {
        if(error == null){
          res.send(JSON.stringify({message: "User "+user_load.name+ " and his contacts successfully removed"}, null, 3));
        }else{
          res.send(JSON.stringify({message: "Could not remove user " + user_load.name}, null, 3));
        }
      })
    }
  });
});

// UPDATE an existing User
router.put('/users/:id', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  AddressBookUser.findById(req.params.id, function(err, user_load){
    if(user_load == undefined || err != null){
      res.send(JSON.stringify({message: "Unable to find user " + req.params.id}, null, 3));
    }else{
      user_load.name = req.body.name;
      user_load.save(function(error) {
        if(error == null){
          res.send(JSON.stringify({message: "User "+user_load.name+ " updated"}, null, 3));
        }else{
          res.send(JSON.stringify({message: "Could not update user " + user_load.name}, null, 3));
        }
      })
    }
  });
});

// GET all contacts from an User
router.get('/users/:id/contacts', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  AddressBookUser.findById(req.params.id, function(err, user_load){
    if(user_load == undefined || err!=null){
      res.send(JSON.stringify({message: "Unable to find user " + req.params.id}, null, 3));
    }else{
      var contactsRef =  firebase.database().ref('address-book').child(req.params.id);
      contactsRef.once("value", function(contactList) {
        var msg = {message: "No contacts for user : "+user_load.name};
        res.send(JSON.stringify(contactList.val()!=null ? contactList.val() : msg, null, 3));
      });
    }
  });
});

// CREATE a new contact for an User
router.post('/users/:id/contacts/', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  var contactInfo = req.body;
  AddressBookUser.findById(req.params.id, function(err, user_load){
    if(user_load == undefined || err!=null){
        res.send(JSON.stringify({message: "Unable to find user " + req.params.id}, null, 3));
    }else{
      var contactRef =  firebase.database().ref('address-book').child(req.params.id);
      var contact = contactRef.push(contactInfo);
      res.send(JSON.stringify({message: "Contact added " + contact.key}, null, 3));
        //res.send(JSON.stringify({message: "User Address : "+ contact.address}, null, 3));
    }
  });
});

// DELETE a contact from an existing User
router.delete('/users/:id/contacts/:contact_id', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  AddressBookUser.findById(req.params.id, function(err, user_load){
    if(user_load == undefined || err != null){
      res.send(JSON.stringify({message: "Unable to find user " + req.params.id}, null, 3));
    }else{
      var contactRef =  firebase.database().ref('address-book').child(req.params.id).child(req.params.contact_id);
      contactRef.once("value", function(contact) {
        if(contact.exists()){
          contactRef.remove()
            .then(function(error){
              res.send(JSON.stringify({message: "Contact "+req.params.id+" deleted from User " + user_load.name}, null, 3));
            });
        }else{
          res.send(JSON.stringify({message: "Contact "+req.params.contact_id+" not found"}, null, 3));
        }
      },function (errorObject) {
        res.send(JSON.stringify({message: "The read failed: " + errorObject.code}, null, 3));
      });
    }
  });
});

router.put('/users/:id/contacts/:contact_id', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  AddressBookUser.findById(req.params.id, function(err, user_load){
    if(user_load == undefined || err != null){
      res.send(JSON.stringify({message: "Unable to find user " + req.params.id}, null, 3));
    }else{
      var contactRef =  firebase.database().ref('address-book').child(req.params.id).child(req.params.contact_id);
      contactRef.once("value", function(contact) {
        if(contact.exists()){
          var contactInfo = req.body;
          req.body.name
          contactRef.update(req.body)
            .then(function(error){
              res.send(JSON.stringify({message: "Contact "+req.params.id+" updated for User " + user_load.name}, null, 3));
            });
        }else{
          res.send(JSON.stringify({message: "Contact "+req.params.contact_id+" not found"}, null, 3));
        }
      },function (errorObject) {
        res.send(JSON.stringify({message: "The read failed: " + errorObject.code}, null, 3));
      });
    }
  });
});


module.exports = router;
