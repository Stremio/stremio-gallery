const fs = require('fs')
const needle = require('needle')

const artRepo = 'Stremio/stremio-art'

function initBuild(allThumbnails, allImages) {
	const artRemote = 'https://github.com/'+artRepo+'/raw/main/'

	const galleryTemplate = fs.readFileSync('./html-templates/main.html').toString()

	const imageTemplate = fs.readFileSync('./html-templates/item-image.html').toString()
	const videoTemplate = fs.readFileSync('./html-templates/item-video.html').toString()

	const allItems = allImages.map(item => {
		const hasThumb = allThumbnails.includes(item)
		const extension = item.split('.').pop().toLowerCase()
		const name = item.replace(/\.[^/.]+$/, "").split('-').join(' ')
		if (['jpg','gif','png'].includes(extension)) {
			return imageTemplate
					.split('{item-name}').join(item)
					.replace('{image-url}', artRemote + (hasThumb ? 'thumbnails' : 'originals') + '/' + encodeURIComponent(item))
					.replace('{image-name}', name)
		} else if (['mp4'].includes(extension)) {
			return videoTemplate
					.split('{item-name}').join(item)
					.replace('{video-url}', artRemote + 'originals' + '/' + encodeURIComponent(item))
					.replace('{video-name}', name)
		} else {
			return false
		}
	}).filter(el => !!el)

	const gallery = galleryTemplate.replace('{art-catalog}', allItems.join(''))

	fs.writeFileSync('./index.html', gallery)

	console.log('Build finished: ./index.html')
}

needle.get('https://api.github.com/repos/'+artRepo+'/contents/thumbnails', (err, resp, body) => {
	if (((body || [])[0] || {}).name) {
		const allThumbnails = body.map(el => el.name).filter(el => !!el)
		needle.get('https://api.github.com/repos/'+artRepo+'/contents/originals', (err, resp, body) => {
			if (((body || [])[0] || {}).name) {
				const allImages = body.map(el => el.name).filter(el => !!el)
				initBuild(allThumbnails, allImages)
			} else {
				console.log('Could not retrieve originals from stremio-art')
				process.exit(0)
			}
		})
	} else {
		console.log('Could not retrieve thumbnails from stremio-art')
		process.exit(0)
	}
})
