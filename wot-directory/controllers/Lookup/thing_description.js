var mongoose = require('mongoose');
var Thing_description = mongoose.model('thing_description');
const got = require('got');
var fs = require('fs');
const {performance} = require('perf_hooks');
const crypto = require('crypto');
var async = require("async");
const os = require("os");
const querystring = require('querystring');
const axios = require('axios');


//RETRIEVAL//

module.exports.thingDescriptionFindOne = function(req, res) {
    Thing_description
    .findOne({id: req.params.id})
    .exec(
        function(err, td) {
            if (!td) { 
                return res
                .status(404)
                .send({"message": "thing description " + req.params.id + " not found"});
            } else if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing description", "description": err});
            }
            return res 
            .status(200)
            .send(td);
        }
    );
};

//LISTING//

module.exports.thingDescriptionList = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;

    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

    Thing_description
    .find(req.query,{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing descriptions", "description": err});
            }
            
            tds.forEach(function(td) {
                items[i++] = td;
            });

            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};

//SEARCH//

module.exports.thingDescriptionFind = async function(req, res) {
    //Start calculating time
    req.params.performance = performance.now();
    var json = {};
    var pageFilter = {};

    if (req.query) { 
        console.log(req.query);
        var paginationQuery = req.query;
        req.params.searchText = req.query.content;

        const token = processToken(req, res);
        if(token == null) return;

        try{await pagination(req,res).then((resultData)=>{json = resultData[0]; paginationQuery = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

        Thing_description
        .find({$text: {$search: req.params.searchText}}, {}, pageFilter)
        .exec(
            function(err, tds) {
                if (err) {
                    return res
                    .status(500)
                    .send({"message": "Error while searching the thing description", "description": err});
                }
                console.log(paginationQuery)

                for (let key in req.query) {
                    req.query[key] = req.query[key].toString().split('/')[1];
                }

                return manageDelegationInput(req, res, token, tds);
            }
        );


    } else {
        return res
        .status(400)
        .send({"message": "Invalid serialization or TD.", "description": "No thing description in the request"});
    }
};



module.exports.thingDescriptionFindByAffordance = async function(req, res) {
    var json = {};
    var items = [];
    var i = 0;

    Thing_description
    .aggregate([
        {
            "$project": {
                "arrayofkeyvalue": {
                    "$objectToArray": "$$ROOT." + req.params.affordance
                }
            }
        },
        {
            "$project": {
                "actionKeys": "$arrayofkeyvalue.k"
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "actions": {
                    "$push": "$actionKeys"
                }
            }
        },
        {
            "$unwind": "$actions"
        },
        {
            "$unwind": "$actions"
        },
        {
            "$match": {
                "actions": {
                    "$regex": req.params.name
                }
            }
        },
        {
            "$group": {
                "_id": "$_id"
            }
        },
    ])
    .exec(
        function(err, ids) {
            if (!ids) { 
                return res
                .status(404)
                .send({"message": "thing descriptions not found"});
            } else if (err) {
                return res
                    .status(500)
                    .send({"message": "Error while searching the thing description", "description": err});
                }

            Thing_description
            .find({'_id': { "$in": ids}}, {}, {})
            .exec(
                function(err, tds) {
                    if (!tds) { 
                        return res
                        .status(404)
                        .send({"message": "thing descriptions not found"});
                    } else if (err) {
                        return res
                        .status(500)
                        .send({"message": "Error while searching the thing description", "description": err});
                    }

                    tds.forEach(function(td) {
                        items[i++] = td;
                    });
                    json["items"] = items;

                    return res 
                    .status(200)
                    .json(json);
                }
            );
        }
    );

};

module.exports.thingDescriptionCreatedDay = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;

    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

    Thing_description
    .find({"createdAt":{$gt:new Date(Date.now() - 24*60*60 * 1000)}},{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing descriptions", "description": err});
            }
            
            tds.forEach(function(td) {
                items[i++] = td;
            });

            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};


module.exports.thingDescriptionCreatedWeek = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;

    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

    Thing_description
    .find({"createdAt":{$gt:new Date(Date.now() - 7 * 60 * 60 * 24 * 1000)}},{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing descriptions", "description": err});
            }
            
            tds.forEach(function(td) {
                items[i++] = td;
            });

            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};


module.exports.thingDescriptionUpdatedDay = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;

    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

    Thing_description
    .find({"updatedAt":{$gt:new Date(Date.now() - 24*60*60 * 1000)}},{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing descriptions", "description": err});
            }
            
            tds.forEach(function(td) {
                items[i++] = td;
            });

            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};


module.exports.thingDescriptionUpdatedWeek = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;

    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

    Thing_description
    .find({"updatedAt":{$gt:new Date(Date.now() - 7 * 60 * 60 * 24 * 1000)}},{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing descriptions", "description": err});
            }
            
            tds.forEach(function(td) {
                items[i++] = td;
            });

            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};

module.exports.thingDescriptionUserInterface = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;

    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};

    Thing_description
    .find({links: {$elemMatch: {rel:'UI', type:'text/html'}}},{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the thing descriptions", "description": err});
            }
            
            tds.forEach(function(td) {
                items[i++] = td;
            });

            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};


module.exports.metricsNaturalLanguage = async function(req, res) {
    got(process.env.AI_URI_DEVELOPMENT + "/metrics" )
    .then(response => {
        res.status(200).send(response.body);
    })
    .catch(err => {
        console.error(err);
        res.status(500).send({"message": "Error while fetching metrics", "description": err.message});
    });
}

module.exports.retrainNaturalLanguage = async function(req, res) {
    got(process.env.AI_URI_DEVELOPMENT + "/retrain" )
    .then(response => {
        res.status(200).send(response.body);
    })
    .catch(err => {
        console.error(err);
        res.status(500).send({"message": "Error while fetching retraining the AI service", "description": err.message});
    });
}



module.exports.processNaturalLanguage = async function(req, res) {
    //Start calculating time
    req.params.performance = performance.now();
    //
    removeExpiredTokens(req);
    var token = crypto.randomBytes(16).toString('hex');
    //Check if token to not repeate queries
    if(req.query.token)
    {
        //Check if it has token (it means that it has been delegated)
        //If it has token then I check if I already have that token, I don't care about the node.
        //If I have token then I return empty
        //If I don't have token then I keep it and return the result (I do all the ifs)
        //If I am going to re-delegate then I pass the token to the next node to save it.)
        token = req.query.token;
        console.log("Query includes token");
        console.log(req.app.locals.delegationMap);
        if(req.app.locals.delegationMap.has(token))
        {
            console.log("Token detected in the private list");
            return res.status(204).send({"message": "Query already delegated"});
        }else
        {
            req.app.locals.delegationMap.set(token, new Date(Date.now() + 300000))
            console.log("Token no detected, creating token...");
        }
    }else
    {
        req.app.locals.delegationMap.set(token, new Date(Date.now() + 300000))
    }

    got(process.env.AI_URI_DEVELOPMENT + "/predict/" + req.params.sentence, {
        https: {
            rejectUnauthorized: false
        }
    })
    .then(response => {
        console.log(req.get('host'));
        console.log(req.connection.localAddress);
        console.log(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
        console.log(req.connection.remotePort);

        req.params.hops = parseInt(req.query.hops);
        if(isNaN(req.params.hops)) req.params.hops = 0;

        req.params.time = parseFloat(req.query.time);
        if(isNaN(req.params.time)) req.params.time = 0.0;

        artificialTreshold = parseFloat(req.query.treshold);
        if(isNaN(artificialTreshold)) artificialTreshold = 0.5;
        
        console.log(JSON.parse(response.body).prediction.length)
        
        if(JSON.parse(response.body).prediction.length == 0 || JSON.parse(response.body).prediction != 'undefined' && (parseFloat(JSON.parse(response.body).prediction[0][0].match(/(?<=\()(.*?)(?=\))/g)) < artificialTreshold || (req.query.path != 'undefined' && req.query.path != undefined)))
        {
            if(req.query.path != undefined && req.query.path.length == 0)
            {
                return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": 0}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "predictions": JSON.parse(response.body).prediction[0]}]}));
            }

            if(req.query.hopLimit != 'undefined' && (req.params.hops+1) > parseInt(req.query.hopLimit))
            {
                console.log("Hop limit reached");
                return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": 0}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "predictions": JSON.parse(response.body).prediction[0]}]}));
            }

            req.params.prediction = response.body;
            req.params.hopLimit = req.query.hopLimit;
            req.params.timeLimit = req.query.timeLimit;
            req.params.hops += 1;

            //Extract local address to inform the central server about the identity of this node
            if(!(hasDockerCGroup() || hasDockerEnv()))
            {
                req.params.localAddress = req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort;
            }else
            {
                console.log("Inside docker");
                req.params.localAddress = req.connection.localPort.toString();
            }

            if(!req.query.token && req.query.typeSearch == 'recommended')
            {
                askCentralServer(req, res, token);
            }else
            {
                if(req.query.path != 'undefined' && req.query.path != undefined) req.params.path = req.query.path.split(',');
                delegateQuery(req, res, token);
            }
        
        } else 
        {
            console.log("No delegating")
            res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": req.params.hops}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "predictions": JSON.parse(response.body).prediction[0]}]}));
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).send({"message": "Artificial Intelligence service unavailable"});
    });
    }

/*******************************/
/********EXTRA FUNCTIONS********/
/*******************************/

function askCentralServer(req, res, token)
{
    got(process.env.CENTRAL_SERVER_DEVELOPMENT + '/getPath/'+ req.params.sentence + "&" + req.params.localAddress)
    .then(response => {
        req.params.path = JSON.parse(response.body).path[0];
        delegateQuery(req, res, token);
    })
    .catch(error => {
        console.error('Error:', error);
        req.params.path = undefined;
        delegateQuery(req, res, token)
    });
}

function delegateQuery(req, res, token) {
    var pageFilter = {};
    const options = {
        //localPort: parseInt(process.env.WEB_APP_PORT) + 1
    };

    //Avoid addresses system. Currently disabled.
    var avoidAddresses = [];
    if (req.params.avoid) avoidAddresses.push(req.params.avoid);
    //


    var query = { '@type': 'ThingDirectory', 'base': { $nin: avoidAddresses.map(address => new RegExp(`${address}`, "i")) } };


    
    
    if(req.params.path != undefined && req.params.path.length > 0 && req.params.path != 'undefined') 
    {
        query = { '@type': 'ThingDirectory', 'base': { $nin: avoidAddresses.map(address => new RegExp(`${address}`, "i")), $in: [new RegExp(`${req.params.path[0]}`, "i")]} };
    }
    console.log(query)
    console.log(os.hostname())
    Thing_description
    .find(query,{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                    .status(500)
                    .send({"message": "Error while searching the directories", "description": err});
            }

            currentTime = Number(req.params.time) + Number((performance.now() - req.params.performance).toFixed(2));
            console.log("Suma tiempos: " + currentTime + " ms");
            var timeLimit = 100000;

            if(req.query.timeLimit != 'undefined')
            {
                if((currentTime) > parseFloat(req.query.timeLimit))
                {
                    console.log("Time limit reached");
                    return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": 0}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "predictions": JSON.parse(req.params.prediction).prediction[0]}]}));
                }
                timeLimit = parseFloat(req.query.timeLimit);
            }

            if (req.query.typeSearch == 'first') {
                tds = tds.slice(0, 1);
            }

            const requests = tds.map(async (td) => {
                console.log("Query delegated to: '" + td.base);
                console.log(req.params.path);
                if (req.params.path != undefined) req.params.path.shift(); // Remove the first element of req.params.path
                currentTime = Number(req.params.time) + Number((performance.now() - req.params.performance).toFixed(2));
                console.log("Suma tiempos: " + currentTime + " ms");
                const timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        console.log("Time Out")
                        reject(response = {"message": "Time reached the limit"});
                    }, timeLimit); // Timeout after 10 seconds
                });

                try {
                    const response = await Promise.race([timeoutPromise, got(td.base + "/predict/" + req.params.sentence + "?token=" + token + "&hops=" + req.params.hops + "&hopLimit=" + req.params.hopLimit + "&time=" + currentTime + "&timeLimit=" + req.params.timeLimit + "&path=" + req.params.path + "&treshold=" + req.query.treshold, options)]);
                    console.log((performance.now()-req.params.performance).toFixed(2) + " ms");
                    var jumps = req.params.hops;
                    var discBase = td.base;
                    if (response.statusCode == 204) {
                        return undefined;
                    } else {
                        jumps = JSON.parse(response.body)["Number of hops "];
                        discBase = JSON.parse(response.body)["Query from node "];
                    }
                    //No añadir aquí, añadir al final porque entonces se duplica por cada petición
                    var predictions = JSON.parse(response.body)["items"];
                    return Object.assign({"Query from node ":discBase}, {"Number of hops ": jumps}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": predictions});
                } catch (err) {
                    console.log(err);
                    return {"message": "Discovery " + td.title + " unavailable"};
                }
            });

            Promise.all(requests)
                .then(results => {
                    console.log(results)
                    
                    let highestHops = 0;
                    let highestTime = (performance.now()-req.params.performance);
                    let highestQuery = "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort;
                    let predictions = [];
                    var included = false;

                    if(results.length < 2) highestHops = -1;

                    results.forEach(result => {
                        if(result == undefined)
                        {
                            if(included == false)
                            {
                                predictions.push({"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "predictions": JSON.parse(req.params.prediction).prediction[0]});
                                included = true;
                            }
                        }else
                        {
                            const hops = result['Number of hops '];
                            const time = parseFloat(result['Total time ']);
                            const query = result['Query from node '];

                            if (hops > highestHops) {
                                highestHops = hops;
                                highestQuery = query;
                            }else if(hops == highestHops)
                            {
                                highestQuery = query;
                            }
                            predictions = predictions.concat(result.items);
                        }
                    });
                    if(included == false) predictions.push({"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "predictions": JSON.parse(req.params.prediction).prediction[0]});
                    const response = Object.assign(
                        {'Query from node ': highestQuery},
                        {'Number of hops ': highestHops+1},
                        {'Total time ': highestTime.toFixed(2) + ' ms'},
                        {'items': predictions}
                    );

                    return res.status(200).json(response);
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).send({"message": "Error while processing requests", "description": err});
                });
        }
    );

}

function processToken(req, res, isSparql=false)
{
    removeExpiredTokens(req);
    var token = crypto.randomBytes(16).toString('hex');
    //Check if token to not repeate queries
    if(req.query.token)
    {
        token = req.query.token;
        console.log("Query includes token");
        console.log(req.app.locals.delegationMap);
        if(req.app.locals.delegationMap.has(token))
        {
            console.log("Token detected in the private list");
            if(!isSparql) res.status(204).send({"message": "Query already delegated"});
            if(isSparql) res.status(200).send({"head": {"vars": ["s","p","o"]},"results": {"bindings": []}});
            return null;
        }else
        {
            req.app.locals.delegationMap.set(token, new Date(Date.now() + 300000))
            console.log("Token no detected, creating token...");
        }
    }else
    {
        req.app.locals.delegationMap.set(token, new Date(Date.now() + 300000))
    }

    return token;
}

function removeExpiredTokens(req)
{
    req.app.locals.delegationMap.forEach(function(value, key) {
        if(value < new Date(Date.now()))
        {
            console.log(key + " expired - " + value);
            req.app.locals.delegationMap.delete(key);
        }
    });
}


module.exports.thingDescriptionDirectories = async function(req, res) {
    var json = {}; // empty Object
    var pageFilter = {};
    var items = [];
    var i = 0;
    
    try{await pagination(req,res).then((resultData)=>{json = resultData[0]; req.query = resultData[1]; pageFilter = resultData[2]});}catch(error){return;};
    
    Thing_description
    .find({'@type': 'ThingDirectory'},{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                .status(500)
                .send({"message": "Error while searching the directories", "description": err});
            }
                
            tds.forEach(function(td) {
                items[i++] = td;
            });
    
            json["items"] = items;
            return res 
                .status(200)
                .json(json);
        }
    );
};


function pagination(req, res)
{
    var baseUrl = "http://" + req.connection.localAddress.replace(/^.*:/, '') + ":" + req.connection.localPort;
    var path = req.originalUrl.replace(/[^?]*$/i, "");
    var json = {};
    var links = {};
    var pageJson = {};
    var page = Number(req.query.page) || 0;
    var pageSize = Number(req.query.size) || 0;
    var queryString = "";
    var result = [json, req.query, {skip: page*pageSize, limit: pageSize}];

    if((isNaN(Number(req.query["page"])) && !isNaN(Number(req.query["size"]))) || (!isNaN(Number(req.query["page"])) && isNaN(Number(req.query["size"]))) || Number(req.query["page"]) < 0 || Number(req.query["size"]) <= 0)
    {
        return res
            .status(400)
            .send({"message": "Pagination sintax incorrect", "description": "The pagination must follow the sintax: " + path + "page=0&size=2"});
    }

    delete req.query["page"];
    delete req.query["size"];
        
    var paginationPromise = new Promise(function(resolve, reject) {
        
        for(var arguments in req.query)
        {
            queryString += arguments + "=" + req.query[arguments] + "&";
            req.query[arguments] = new RegExp(req.query[arguments], "i");
        }

        if(pageSize==0)
        {
            resolve(result); 
            return paginationPromise;
        }
   

        Thing_description.countDocuments(req.query, function(err, count) {
            links["first"] =  { href: baseUrl + path + queryString + "page=0&size=" + pageSize };
            links["self"] =  { href: baseUrl };
            if((page+1)*pageSize < count) links["next"] = { href: baseUrl + path + queryString + "page="+ (page+1) + "&size="+ pageSize };
            if(page != 0) links["prev"] = { href: baseUrl + path + queryString + "page="+ (page-1) + "&size="+ pageSize };
            links["last"] =  { href: baseUrl + path + queryString + "page=" + (Math.ceil(count/pageSize)-1) + "&size=" + pageSize };

            pageJson["size"] = pageSize;
            pageJson["totalElements"] = count;
            pageJson["totalPages"] = (Math.ceil(count/pageSize)-1)+1;
            pageJson["number"] = page;

            json["_links"] = links;
            json["page"] = pageJson;

            resolve(result);
        });
    });

    return paginationPromise;
}


function hasDockerEnv() {
	try {
		fs.statSync('/.dockerenv');
		return true;
	} catch {
		return false;
	}
}

function hasDockerCGroup() {
	try {
		return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
	} catch {
		return false;
	}
}








function delegateQuery2(req, res, token) {
    var pageFilter = {};
    const options = {
        //localPort: parseInt(process.env.WEB_APP_PORT) + 1
    };

    //Avoid addresses system. Currently disabled.
    var avoidAddresses = [];
    if (req.params.avoid) avoidAddresses.push(req.params.avoid);
    //

    var query = { '@type': 'ThingDirectory', 'base': { $nin: avoidAddresses.map(address => new RegExp(`${address}`, "i")) } };
    

    
    if(req.params.path != undefined && req.params.path.length > 0 && req.params.path != 'undefined') 
    {
        query = { '@type': 'ThingDirectory', 'base': { $nin: avoidAddresses.map(address => new RegExp(`${address}`, "i")), $in: [new RegExp(`${req.params.path[0]}`, "i")]} };
    }
    console.log(query)
    console.log(os.hostname())
    Thing_description
    .find(query,{},pageFilter)
    .sort({"id" : 1})
    .exec(
        async function(err, tds) {
            if (err) {
                return res
                    .status(500)
                    .send({"message": "Error while searching the directories", "description": err});
            }



            currentTime = Number(req.params.time) + Number((performance.now() - req.params.performance).toFixed(2));
            console.log("Total time: " + currentTime + " ms");
            var timeLimit = 30000;
            
            if(req.query.timeLimit != undefined && req.query.timeLimit != 'undefined')
            {
                if((currentTime) > parseFloat(req.query.timeLimit))
                {
                    console.log("Time limit reached");
                    return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": 0}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "result": req.params.items}]}));
                }
                timeLimit = parseFloat(req.query.timeLimit);
            }

            if (req.query.typeSearch == 'first') {
                tds = tds.slice(0, 1);
            }

            var nodeDestination = []

            const requests = tds.map(async (td) => {
                const tdJson = JSON.parse(JSON.stringify(td));
                console.log("Query delegated to: '" + td.base);
                console.log(req.params.path);

                if (req.params.path != undefined) req.params.path.shift(); // Remove the first element of req.params.path
                currentTime = Number(req.params.time) + Number((performance.now() - req.params.performance).toFixed(2));
                console.log("Total time: " + currentTime + " ms");
                console.log(td.base)

                var endpoint = "/search?content="
                var auxSearchText = req.params.searchText;

                const timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        console.log("Time Out")
                        reject(response = {"message": "Time reached the limit"});
                    }, timeLimit); // Timeout after 30 seconds
                });

                try {
                    const response = await Promise.race([timeoutPromise, got(td.base + endpoint + auxSearchText + "&token=" + token + "&hops=" + req.params.hops + "&hopLimit=" + req.params.hopLimit + "&time=" + currentTime + "&timeLimit=" + req.params.timeLimit + "&path=" + req.params.path + "&typeSearch=" + req.query.typeSearch, options)]);
                    //const response = await Promise.race([timeoutPromise, got(td.base + "/api" + endpoint + auxSearchText, options)]);
                    console.log((performance.now()-req.params.performance).toFixed(2) + " ms");
                    var jumps = req.params.hops;
                    var discBase = td.base;
                    console.log(response.body);
                    if (response.statusCode == 204) {
                        return undefined;
                    } else {
                        jumps = JSON.parse(response.body)["Number of hops "]? JSON.parse(response.body)["Number of hops "] : jumps;
                        discBase = JSON.parse(response.body)["Query from node "]? JSON.parse(response.body)["Query from node "] : discBase;
                    }

                    nodeDestination.push(td.base);
                    var result;
                    if (JSON.parse(response.body)["items"]) {
                        result = JSON.parse(response.body)["items"];

                    } else {
                        if(JSON.parse(response.body).length > 0)
                        {
                            let items = JSON.parse(response.body);
                            result = [Object.assign({"node":discBase}, {"result": {"items": items}})];

                        }else {
                            result = [Object.assign({"node":discBase}, {"result": "No Result"})];
                        }
                    
                    }
                    
                    return Object.assign({"Query from node ":discBase}, {"Number of hops ": jumps}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": result});
                } catch (err) {
                    console.log(err);
                    return {"message": "Discovery " + td.title + " unavailable"};
                }
            });

            Promise.all(requests)
                .then(results => {
                    console.log(results)
                    
                    let highestHops = 0;
                    let highestTime = (performance.now()-req.params.performance);
                    let highestQuery = "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort;
                    let predictions = [];
                    var included = false;

                    if(results.length < 2) highestHops = -1;

                    results.forEach(result => {
                        if(result == undefined)
                        {
                            if(included == false)
                            {
                                predictions.push({"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "result": req.params.items, "delegatedTo": nodeDestination});
                                included = true;
                            }
                        }else
                        {
                            const hops = result['Number of hops '];
                            const time = parseFloat(result['Total time ']);
                            const query = result['Query from node '];
                            if(result.items) {
                                for (let item of result.items) {
                                    if ((hops > highestHops || hops == highestHops) && item.result.items && item.result != "No Result") {
    
                                        highestHops = hops;
                                        highestQuery = query;
                                        break;
                                    }
                                }
                            }

                            predictions = predictions.concat(result.items);
                        }
                    });
                    if(included == false) predictions.push({"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "result": req.params.items, "delegatedTo": nodeDestination});
                    predictions = predictions.filter(item => item !== undefined && item !== null);

                    const response = Object.assign(
                        {'Query from node ': highestQuery},
                        {'Number of hops ': highestHops},
                        {'Total time ': highestTime.toFixed(2) + ' ms'},
                        {'items': predictions}
                    );

                    return res.status(200).json(response);
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).send({"message": "Error while processing requests", "description": err});
                });
        }
    );

}


async function manageDelegationInput(req, res, token, tds) {
    var items = [];
    var i = 0;
    var json = {};

    console.log(req.params.originalQuery)
    console.log(req.query)
    console.log(req.get('host'));
    console.log(req.connection.localAddress);
    console.log(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    console.log(req.connection.remotePort);

    req.params.hops = parseInt(req.query.hops);
    if(isNaN(req.params.hops)) req.params.hops = 0;

    req.params.time = parseFloat(req.query.time);
    if(isNaN(req.params.time)) req.params.time = 0.0;

    if(!tds || tds.length == 0 || (req.query.path != 'undefined' && req.query.path != undefined))
    {
        if(req.query.path != undefined && req.query.path.length == 0)
        {
            return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": 0}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "result": "No Result"}]}));
        }

        if(req.query.hopLimit != 'undefined' && (req.params.hops+1) > parseInt(req.query.hopLimit))
        {
            console.log("Hop limit reached");
            return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": 0}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "result": "No Result"}]}));
        }

        req.params.items = "No Result";
        req.params.hopLimit = req.query.hopLimit;
        req.params.timeLimit = req.query.timeLimit;
        req.params.hops += 1;

        //Extract local address to inform the central server about the identity of this node
        if(!(hasDockerCGroup() || hasDockerEnv()))
        {
            req.params.localAddress = req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort;
        }else
        {
            console.log("Inside docker");
            req.params.localAddress = req.connection.localPort.toString();
        }

        if(!req.query.token && req.query.typeSearch == 'recommended')
        {
            askCentralServer(req, res, token);
        }else
        {
            if(req.query.path != 'undefined' && req.query.path != undefined) req.params.path = req.query.path.split(',');
            delegateQuery2(req, res, token);
        }
    
    } else
    {
        tds.forEach(function(td) {
            items[i++] = td;
        });
        json["items"] = items;
        
        console.log("No delegating")
        console.log(json)
        return res.status(200).send(Object.assign({"Query from node ":"http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort}, {"Number of hops ": req.params.hops}, {"Total time ": (performance.now()-req.params.performance).toFixed(2) + " ms"}, {"items": [{"node": "http://" + req.connection.localAddress.match(/([^\:]+$)/g).toString() + ":" + req.connection.localPort, "result": json}]}));
    }

}