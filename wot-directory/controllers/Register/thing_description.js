const schema = require('../../schema.json');
const Ajv = require("ajv").default;
const apply = require('ajv-formats');

var mongoose = require('mongoose');
var Thing_description = mongoose.model('thing_description');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const jsonld = require('jsonld');

function validate(data, res)
{
    var ajv = new Ajv();
    apply(ajv);
    //console.log(data)
  
    var validate = ajv.compile(schema);
    var valid = validate(data);
    //console.log(data)
    if (valid) return true;

    res.status(400).send({"message": "Invalid serialization or TD.", "description": validate.errors});
    
    return false;

}

//UPDATE//
module.exports.thingDescriptionCreateUpdate = async function(req, res) {
    if (req.params && req.params.id) { 
        req.body.updatedAt = Date.now();
        const json = JSON.parse(JSON.stringify(req.body));

        if(!validate(req.body, res)) return;

        //If the ID is being changed, check if the new ID is already in use
        if(req.params.id != req.body.id)
        {
                const existingDoc = await Thing_description.findOne({id: req.body.id});
                if(existingDoc) return res.status(400).send({"message": "Invalid serialization or TD.", "description": "The is already a Thing Description with the new ID"});
        }


        Thing_description
        .findOneAndUpdate({id: req.params.id},req.body,{ upsert: true, setDefaultsOnInsert: true },function(err, td) {
            if (!err) { 
                if (!td) {
                    // Create it
                    td = new Thing_description(req.body);  
                    return res 
                    .status(201)
                    .send();
                }
                return res 
                .status(204)
                .send();
            }
            return res
            .status(400)
            .send({"message": "Invalid serialization or TD.", "description": err});
        });
    } else {
        return res
        .status(400)
        .send({"message": "Invalid serialization or TD.", "description": "No thing description in the request"});
    }
};

//CREATION//
module.exports.thingDescriptionCreate = async function(req, res) {
    if(!req.body.id) req.body.id = "urn:uuid:" + uuidv4();
    req.body.updatedAt = Date.now();
    var baseUrl = "http://" + req.connection.localAddress.replace(/^.*:/, '') + ":" + req.connection.localPort;
    const json = JSON.parse(JSON.stringify(req.body));
    
    if(!validate(req.body, res)) return;

    Thing_description
    .findOneAndUpdate({id: req.body.id},req.body, { upsert: true, setDefaultsOnInsert: true },function(err, td) {
        if (!err) { 
           // Create it
           td = new Thing_description(req.body);  
           console.log(Object.keys(JSON.parse(JSON.stringify(td))));
           return res 
            .writeHead(201, {
            'Location': baseUrl + '/td/' + req.body.id
            })
            .send();
        }
        
        return res
        .status(400)
        .send({"message": "Invalid serialization or TD.", "description": err});
    });    
};

//DELETION//
module.exports.thingDescriptionDelete = async function(req, res) {
    if (req.params && req.params.id) { 

        try {
            // Find and delete the document in MongoDB
            const deletedDoc = await Thing_description.findOneAndDelete({id: req.params.id});

            if (!deletedDoc) {
                return res
                .status(404)
                .send({"message": "Thing Description " + req.params.id + " not found"});
            }

            console.log('Document deleted successfully:', deletedDoc);
            return res 
            .status(204)
            .send();

        } catch (error) {
            return res
            .status(500)
            .send({"message": "Error deleting the Thing Description from MongoDB", "description": error});
        }

        

    }else {
        return res
        .status(400)
        .send({"message": "No thing description in the request", "description": err});
    }

};
