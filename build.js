const fs = require('fs')
const needle = require('needle')

const artRepo = 'Stremio/stremio-art'

function itemToHtmlPage(item) {
	const ext = item.split('.').pop()
	return encodeURIComponent(item.replace('.' + ext, '-' + ext + '.html'))
}

function initBuild(allThumbnails, allImages, allBumps) {
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
					.replace('{item-href}', 'https://art.stremio.com/items/' + itemToHtmlPage(item))
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

	if (!fs.existsSync('./items'))
		fs.mkdirSync('./items')

	const itemFullpageTemplate = fs.readFileSync('./html-templates/item-image-fullpage.html').toString()

	function htmlPageForItem(item) {
	  	const ext = item.split('.').pop()
	  	return encodeURIComponent(item.replace('.' + ext, '-' + ext + '.html'))
	}

	let listWithVotes = []

  	allImages.forEach(item => {
  		listWithVotes.push({ item, bumps: allBumps[item] || 0 })
  	})

  	listWithVotes.sort((a,b) => b.bumps - a.bumps)

	allImages.forEach(item => {
	  	const ext = item.split('.').pop()
	  	const htmlFile = item.replace('.' + ext, '-' + ext + '.html')

	  	let vidUrl = ''
	  	let imgUrl = ''

	  	if (item.toLowerCase().endsWith('.mp4'))
	  		vidUrl = item
	  	else
	  		imgUrl = item

		const name = item.replace(/\.[^/.]+$/, "").split('-').join(' ')

		const hasThumb = allThumbnails.includes(item)

	  	let idx = -1

	  	listWithVotes.some((el, ij) => {
	  		if (el.item == item) {
	  			idx = ij
	  			return true
	  		}
	  	})

	  	let nextUrl = ''
	  	let prevUrl = ''

	  	if (idx > -1) {
	  		if (listWithVotes[idx-1]) {
	  			prevUrl = htmlPageForItem(listWithVotes[idx-1].item)
	  		}
	  		if (listWithVotes[idx+1]) {
	  			nextUrl = htmlPageForItem(listWithVotes[idx+1].item)
	  		}	  		
	  	}

		fs.writeFileSync('./items/' + htmlFile, itemFullpageTemplate
												.split('{item-name}').join(item)
												.split('{image-url}').join(artRemote + 'originals' + '/' + encodeURIComponent(imgUrl))
												.split('{item-thumb}').join(vidUrl ? '' : artRemote + (hasThumb ? 'thumbnails' : 'originals') + '/' + encodeURIComponent(imgUrl))
												.split('{video-url}').join(artRemote + 'originals' + '/' + encodeURIComponent(vidUrl))
												.split('{image-name}').join(name)
												.split('{prev-url}').join(prevUrl)
												.split('{next-url}').join(nextUrl)
												.replace('{all-items}', JSON.stringify(allImages))
											)
	})

	console.log('Build finished: ./index.html ./items/*.html')
}

needle.get('https://api.github.com/repos/'+artRepo+'/contents/thumbnails', (err, resp, body) => {
	if (((body || [])[0] || {}).name) {
		const allThumbnails = body.map(el => el.name).filter(el => !!el)
		needle.get('https://api.github.com/repos/'+artRepo+'/contents/originals', (err, resp, body) => {
			if (((body || [])[0] || {}).name) {
				const allImages = body.map(el => el.name).filter(el => !!el)
				needle.get('https://bumper.stremio.workers.dev/get', (err, resp, body) => {
					if (Object.keys(body || {}).length) {
						const allBumps = body
						initBuild(allThumbnails, allImages, allBumps)
					} else {
						console.log(body)
						console.log('Could not retrieve image bumps')
						process.exit(0)
					}
				})
			} else {
				console.log(body)
				console.log('Could not retrieve originals from stremio-art')
				process.exit(0)
			}
		})
	} else {
		console.log(body)
		console.log('Could not retrieve thumbnails from stremio-art')
		process.exit(0)
	}
})
