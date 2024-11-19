const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const xml2js = require('xml2js');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); // json body parsing
app.use(express.static(path.join(__dirname, '/public')));  // serve the static frontend

const upload = multer({ dest: 'uploads/' });

app.post('/api/merge-modlists', upload.fields([{ name: 'file1' }, { name: 'file2' }]), (req, res) => {
  const file1Path = req.files.file1[0].path;
  const file2Path = req.files.file2[0].path;
  const outputFilePath = path.join(__dirname, 'merged_modlist.xml');

  if (fs.existsSync(file1Path) && fs.existsSync(file2Path)) {
    mergeModlists(file1Path, file2Path, outputFilePath)
      .then(() => {
        res.download(outputFilePath, 'merged_modlist.xml', (err) => {
          if (err) {
            res.status(500).send('Error downloading the file.');
          }
          fs.unlinkSync(file1Path);
          fs.unlinkSync(file2Path);
          fs.unlinkSync(outputFilePath);
        });
      })
      .catch(err => {
        res.status(500).send('Error merging modlists: ' + err.message);
      });
  } else {
    res.status(400).send('One or both input files do not exist.');
  }
});

async function mergeModlists(file1, file2, outputFile) {
  const parser = new xml2js.Parser();
  const builder = new xml2js.Builder({ headless: true, renderOpts: { pretty: true, indent: '    ' } });

  const [data1, data2] = await Promise.all([
    fs.promises.readFile(file1, 'utf-8').then(parser.parseStringPromise),
    fs.promises.readFile(file2, 'utf-8').then(parser.parseStringPromise)
  ]);

  const modIds = new Set();
  data1.ModsConfigData.activeMods[0].li.forEach(mod => modIds.add(mod));
  data2.ModsConfigData.activeMods[0].li.forEach(mod => modIds.add(mod));

  const mergedData = {
    ModsConfigData: {
      version: data1.ModsConfigData.version,
      activeMods: [{ li: Array.from(modIds).sort() }],
      knownExpansions: data1.ModsConfigData.knownExpansions
    }
  };

  const xml = builder.buildObject(mergedData);
  await fs.promises.writeFile(outputFile, xml, 'utf-8');
}

app.post('/api/create-modlist', async (req, res) => {
  const { link, royalty, ideology, biotech, anomaly } = req.body;

  if (!link) {
    return res.status(400).send('Link is required.');
  }

  const dlcSelection = [];
  if (royalty) dlcSelection.push('royalty');
  if (ideology) dlcSelection.push('ideology');
  if (biotech) dlcSelection.push('biotech');
  if (anomaly) dlcSelection.push('anomaly');

  try {
    const mods = await getSteamMods(link);
    const xml = await createXML(mods, dlcSelection);
    
    // Create temporary file
    const outputFilePath = path.join(__dirname, 'generated_modlist.xml');
    await fs.promises.writeFile(outputFilePath, xml, 'utf-8');

    // Send both the file and the unfound mods info
    res.setHeader('Content-Type', 'application/json');
    res.attachment('ModsConfig.xml');
    res.send({
      xml: xml,
      unfoundMods: mods.unfound
    });

    // Clean up the temporary file
    fs.unlinkSync(outputFilePath);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to process mods',
      message: error.message 
    });
  }
});

async function getSteamMods(url) {
  const resonse = await axios.get(url);

  const $ = cheerio.load(resonse.data);
  const steamLinkNodes = $('.collectionItem');
  const ids = [];
  const unfound = [];

  const modMapping = JSON.parse(fs.readFileSync('mod_steam_mapping.json', 'utf8'));

  steamLinkNodes.each((_, node) => {
    const id = $(node).attr('id').toString().replace('sharedfile_', '');
    const name = $(node).find('.workshopItemTitle').text();
    if (id) {
      if(modMapping[id]) {
        const mapping = modMapping[id];
        ids.push(mapping);
        console.log(`Mod with id ${id} found with mapping ${mapping}.`);
      } else {
        unfound.push(name);
        console.log(`Mod with name ${name} not found in the mapping.`);
      }
    }
  });

  if(ids.length === 0) {
    throw new Error('No mods found on the page.');
  };

  return ({ ids, unfound });
};

async function createXML(mods, dlcSelection) {
  const { Builder } = require('xml2js');
  const builder = new Builder({
    renderOpts: { pretty: true, indent: '  ', newline: '\n' }
  });
  
  // Create the XML structure
  const xmlObj = {
    ModsConfigData: {
      version: ['1.5.4243 rev947'],
      activeMods: [{
        li: mods.ids
      }],
      knownExpansions: [{
        li: dlcSelection
      }]
    }
  };

  // Convert to XML with pretty formatting
  const xml = builder.buildObject(xmlObj);

  return xml;
};

app.listen(PORT, () => console.log(`server is now running on port ${PORT}`));