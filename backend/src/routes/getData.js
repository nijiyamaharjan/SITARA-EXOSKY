const express = require("express");
const { body, validationResult } = require("express-validator");
const qs = require("qs");
const formatStarData = require("../services/formatStarData");
const axios = require('axios');

const router = express.Router();

router.get('/api/getStarData', [], async (req, res) => {
  
    const { ra, dec, limit = 100, offset = 0, dist, plusminus, magLimit=10, searchRadius=1 } = req.query;
    console.log({ ra, dec, searchRadius, magLimit, dist, plusminus })
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    const url = "https://gea.esac.esa.int/tap-server/tap/sync";
    const upperBound = Number(dist) + Number(plusminus);
const lowerBound = dist - plusminus;

console.log(upperBound, lowerBound)


    const query = `
    
    SELECT 
  gaia_source.source_id,
  gaia_source.ra,
  gaia_source.dec,
  gaia_source.parallax,
  gaia_source.distance_gspphot,
  gaia_source.phot_g_mean_mag,
  gaia_source.bp_rp
FROM gaiadr3.gaia_source
WHERE 1=CONTAINS(
  POINT('ICRS', gaia_source.ra, gaia_source.dec),
  CIRCLE('ICRS', ${ra}, ${dec}, ${searchRadius}))
AND gaia_source.phot_g_mean_mag <= ${magLimit}
AND gaia_source.distance_gspphot <= ${upperBound}
AND gaia_source.distance_gspphot >= ${lowerBound}
AND gaia_source.parallax IS NOT NULL
ORDER BY gaia_source.distance_gspphot ASC;
   
`;

    try {
        const response = await axios.post(
            url,
            qs.stringify({
                query,
                request: "doQuery",
                lang: "ADQL", 
                format: "json",
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const formatted = formatStarData(response.data.data);

        return res.status(200).json({
          message: "Fetch successful!",
          data: formatted,
          limit: limitNum,
          offset: offsetNum,
          total: response.data.total_count, // You might want to include the total count for better pagination
        });

    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (error.response) {
            return res.status(error.response.status).json({error: error.response.data});
        }
        return res.status(500).send({"error": "An unexpected error occurred."});
    }
});

module.exports = { getStarDataRouter: router };
