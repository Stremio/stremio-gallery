const fs = require('fs')
const path = require('path')

const artLocal = './node_modules/stremio-art/'

const allImages = fs.readdirSync(path.join(artLocal, 'originals'))
const allThumbnails = fs.readdirSync(path.join(artLocal, 'thumbnails'))

const artRemote = 'https://raw.githubusercontent.com/Stremio/stremio-art/main/'

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
				.replace('{image-url}', path.join(artRemote, hasThumb ? 'thumbnails' : 'originals') + '/' + encodeURIComponent(item))
				.replace('{image-name}', name)
	} else if (['mp4'].includes(extension)) {
		return videoTemplate
				.split('{item-name}').join(item)
				.replace('{video-url}', path.join(artRemote, 'originals') + '/' + encodeURIComponent(item))
				.replace('{video-name}', name)
	} else {
		return false
	}
}).filter(el => !!el)

const gallery = galleryTemplate.replace('{art-catalog}', allItems.join(''))

fs.writeFileSync('./index.html', gallery)
