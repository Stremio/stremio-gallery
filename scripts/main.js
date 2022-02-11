
MicroModal.init()

let print = ''

try {
	print = new Fingerprint().get()
} catch(e) {
	print = Date.now() + ''
	console.warn('Fingerprint module could not be loaded, bumping may not work properly')
}

const artLoc = 'https://github.com/Stremio/stremio-art/raw/main/'

const blankPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function openModal(item) {
	const name = item.replace(/\.[^/.]+$/, "").split('-').join(' ')
	// set to blank png first to avoid image flicker
	$('.modal__content a img').attr('src', blankPng)
	setTimeout(() => {
		$('.modal__title').text(name)
		$('.modal__content a').attr('href', artLoc + 'originals/'+encodeURIComponent(item))
		$('.modal__content a img').attr('src', artLoc + 'originals/'+encodeURIComponent(item))
		$('.modal__footer .share-button').attr('data-item', item)
		$('.modal__footer .like-button').attr('data-item', item)
		$('.modal__footer .counter').text((allBumps[item] || 0)+'')
		const isLiked = !!(localStorage && localStorage.getItem(item))
		$('.modal__footer .like-button .user-buttons')[(isLiked ? 'add' : 'remove') + 'Class']('liked')
		// give a bit of time so we don't see the image flicker when we change it
		MicroModal.show('modal-1')
	})
}

const urlParams = new URLSearchParams(window.location.search)

const shareParam = urlParams.get('share')

if (shareParam)
	openModal(shareParam)

function copyLink(link) {
	window.prompt("Copy Addon URL Clipboard: Ctrl+C, Enter", link)
}

function loadIsotope() {
	window.iso = new Isotope('.grid', {
		  itemSelector: '.grid-item',
		  getSortData: {
		    bumps: '.counter',
		    alpha: '.item-title',
		  },
		  layoutMode: 'masonry',
		  fitWidth: true
	})
	window.iso.arrange({ sortBy: 'bumps', sortAscending: false })
}

function toggleLiked(elem) {
	if ($(elem).find('.user-buttons').hasClass('liked')) {
		const counter = $(elem).parent().find('.counter')
		const count = parseInt(counter.text()) -1
		counter.text(count)
		$(elem).find('.user-buttons').removeClass('liked')
	} else {
		const counter = $(elem).parent().find('.counter')
		const count = parseInt(counter.text()) +1
		counter.text(count)
		$(elem).find('.user-buttons').addClass('liked')
	}
}

let imagesLoaded = false
let bumpsLoaded = false

$(window).on('load', function() {
	imagesLoaded = true
	if (bumpsLoaded)
		loadIsotope()
})

let allBumps = {}

$(document).ready(function() {
	fetch('https://bumper.stremio.workers.dev/get')
	  .then(response => response.json())
	  .then(data => {
	  	if (typeof data === 'object') {
	  		allBumps = data
		  	Object.keys(data || {}).forEach(key => {
		  		if (data[key]) {
		  			const elem = $(".grid-item[data-item='"+key+"']")
		  			if (elem.length) {
		  				elem.find('.counter').text(data[key]+'')
			  			if (localStorage && localStorage.getItem(key)) {
			  				// user liked this item too
			  				elem.find('.like-button .user-buttons').addClass('liked')
			  			}
		  			}
		  		}
		  	})
		  }
	  	setTimeout(() => {
	  		bumpsLoaded = true
	  		if (imagesLoaded)
	  			loadIsotope()
	  	})
	  })

	$('.share-button').click(function(ev) {
		ev.preventDefault()
		let currentUrl = window.location.href
		if (currentUrl.includes('?'))
			currentUrl = currentUrl.split('?')[0]
		if (currentUrl.includes('#'))
			currentUrl = currentUrl.split('#')[0]
		const shareLink = currentUrl + '?share=' + encodeURIComponent($(this).attr('data-item'))
		copyLink(shareLink)
		return false
	})

	$('.like-button').click(function(ev) {
		ev.preventDefault()

		const item = $(this).attr('data-item')

		if ($(this).hasClass('is-modal')) {
			// toggle main item too
  			const elem = $(".grid-item[data-item='"+item+"']")
  			if (elem.length) toggleLiked(elem.find('.like-button')[0])
		}

		if ($(this).find('.user-buttons').hasClass('liked')) {
			if (localStorage && localStorage.getItem(item))
				localStorage.removeItem(item)

			toggleLiked(this)

			fetch('https://bumper.stremio.workers.dev/revert?code='+encodeURIComponent(item)+'&uid='+encodeURIComponent(print + '+' + item))
			  .then(response => response.json())
			  .then(data => {
			  	if (!(data || {}).success)
			  		console.warn('Revert bump for ' + item + ' not successful')
			  })
		} else {
			if (localStorage) {
				if (localStorage.getItem(item))
					return false
				localStorage.setItem(item, '1')
			}

			toggleLiked(this)

			fetch('https://bumper.stremio.workers.dev/bump?code='+encodeURIComponent(item)+'&uid='+encodeURIComponent(print + '+' + item))
			  .then(response => response.json())
			  .then(data => {
			  	if (!(data || {}).success)
			  		console.warn('Bump for ' + item + ' not successful')
			  })
		}
		return false
	})
	$('.open-modal').click(function(ev) {
		ev.preventDefault()
		const item = $(this).attr('data-item')
		openModal(item)
		return false
	})
	$('.mod-buttons').click(function(ev) {
		ev.preventDefault()
		window.iso.updateSortData()
		const filter = $(this).text()
		if (filter == 'By Likes') {
			window.iso.arrange({ sortBy: 'bumps', sortAscending: false })
		} else if (filter == 'Alphabetically') {
			window.iso.arrange({ sortBy: 'alpha', sortAscending: true })
		} else if (filter == 'Shuffle') {
			window.iso.shuffle()
		} else if (filter == 'My Likes') {
			window.iso.arrange({
			  filter: function(itemElem) {
			    return $(itemElem).find('.like-button .user-buttons').hasClass('liked')
			  }
			})
			setTimeout(() => {
				window.iso.needsResizeLayout()
			})
		} else if (filter == 'All') {
			window.iso.arrange({
			  filter: '*'
			})
		}
		return false
	})
	$('.go-to-top').click(function(ev) {
		ev.preventDefault()
		$('html, body').animate({ scrollTop: 0 }, 'slow')
		return false
	})
})
