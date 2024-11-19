document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('modlist-generator-form');
    const resultContainer = document.getElementById('result-container');
    const downloadButton = document.getElementById('download-button');
    const unfoundModsContainer = document.getElementById('unfound-mods-container');
    const unfoundModsList = document.getElementById('unfound-mods-list');
    
    let currentXml = null;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            link: document.getElementById('steam-workshop-url').value,
            royalty: document.getElementById('include-royalty').checked,
            ideology: document.getElementById('include-ideology').checked,
            biotech: document.getElementById('include-biotech').checked,
            anomaly: document.getElementById('include-anomaly').checked
        };

        try {
            const response = await fetch('/api/create-modlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (response.ok) {
                currentXml = data.xml;
                resultContainer.style.display = 'block';
                
                // Handle unfound mods
                if (data.unfoundMods && data.unfoundMods.length > 0) {
                    unfoundModsContainer.style.display = 'block';
                    unfoundModsList.innerHTML = data.unfoundMods
                        .map(mod => `<li>${mod}</li>`)
                        .join('');
                } else {
                    unfoundModsContainer.style.display = 'none';
                }
            } else {
                throw new Error(data.message || 'Failed to generate modlist');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    downloadButton.addEventListener('click', () => {
        if (!currentXml) return;
        
        const blob = new Blob([currentXml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ModsConfig.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});