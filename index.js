var axios = require('axios')
var point = require('turf-point')
var fc = require('turf-featurecollection')

var key = process.env.AIRTABLE_KEY
var appId = process.env.AIRTABLE_BASE

function hasLatLng(location) {
  return location.fields.latitude && location.fields.longitude
}

function locationToGeojson (location) {
  const { id, label, link, latitude, longitude, notes } = location.fields;
  return point([Number(latitude), Number(longitude)], { 
    id, 
    label, 
    link, 
    latitude,
    longitude,
    notes
  })
}

function getData () {
  var first = true
  var offset = null
  var headers = { headers: { Authorization: `Bearer ${key}` } }

  function loop (first, offset) {
    first = false
    let url = `https://api.airtable.com/v0/${appId}/Locations`
    if (offset) {
      url += `?offset=${offset}`
    }
    return axios.get(url, headers).then(response => {
      if (response.data.offset) {
        return loop(false, response.data.offset).then(recursiveResults => {
          if (recursiveResults) {
            return response.data.records.concat(recursiveResults)
          }
        })
      } else {
        return response.data.records
      }
    }).catch(error => {
      if (error) {
        throw new Error('Could not download data')
      }
    })
  }

  return loop(first, offset)
}

if(require.main == module) {
    getData()
    .then((data) =>  {
      return data.filter(hasLatLng).map(locationToGeojson)
    })
    .then(data => { return fc(data) })
    .then(data => console.log(JSON.stringify(data)))
    .catch(err => {
      console.error(err)
    })
}
