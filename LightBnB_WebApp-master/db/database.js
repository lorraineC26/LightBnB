const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
      SELECT * 
      FROM users 
      WHERE email = $1
      `, [email])
    .then((result) => {
      if (result.rows) {
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {

  return pool
    .query(`
    SELECT * 
    FROM users 
    WHERE id = $1;
    `, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch(err => {
      console.log(err.message);
    });
  // return Promise.resolve(users[id]);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`
    INSERT INTO users (name, email, password)
    VALUES($1, $2, $3)
    RETURNING *;
    `, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch(err => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit) {
  
  const queryStr = `SELECT reservations.*, properties.*
    FROM reservations
    JOIN properties
    ON reservations.property_id = properties.id
    WHERE reservations.guest_id = $1
    LIMIT $2;
    `;

  return pool
    .query(queryStr, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit) {
  
  const queryParams = [];

  // all information that comes before the WHERE clause
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) AS average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  let conditionClause = 'WHERE';

  // check if a city has been passed in
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `${conditionClause} city LIKE $${queryParams.length} `; //use the length of the array to dynamically get the $n placeholder number
    // 1 param has already existed => all later params should be joined with AND
    conditionClause = 'AND';
  }

  // check if owner_id is passed in
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `${conditionClause} properties.owner_id = $${queryParams.length}`;
    conditionClause = 'AND';
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `${conditionClause} properties.cost_per_night >= $${queryParams.length}`;
    conditionClause = 'AND';
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `${conditionClause} properties.cost_per_night <= $${queryParams.length}`;
    conditionClause = 'AND';
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `${conditionClause} average_rating >= $${queryParams.length}`;
    conditionClause = 'AND';
  }

  // add query that comes after the WHERE clause
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // make sure we've done it right
  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams).then((res) => res.rows);

};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {

  const queryStr = `
    INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const values = [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms, property.country, property.street, property.city, property.province, property.post_code];

  return pool
    .query(queryStr, values)
    .then((result) => {
      return result.rows[0];
    })
    .catch(err => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
