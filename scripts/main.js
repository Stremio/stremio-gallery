
Object.keys(localStorage || {}).forEach(localStorageKey => {
	if (localStorageKey.startsWith('order__list__')) {
		const localStorageTime = parseInt(localStorageKey.replace('order__list__',''))
		if (localStorageTime < Date.now() - 24 * 60 * 60 * 1000) {
			localStorage.removeItem(localStorageKey)
			console.log('clearing old list order: ' + localStorageKey)
		}
	}
})

const host = 'https://art.stremio.com/'

let print = ''

try {
	print = new Fingerprint().get()
} catch(e) {
	print = Date.now() + ''
	console.warn('Fingerprint module could not be loaded, bumping may not work properly')
}

const artLoc = 'https://github.com/Stremio/stremio-art/raw/main/'

const blankPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function itemToHtmlPage(item) {
	const ext = item.split('.').pop()
	return encodeURIComponent(item.replace('.' + ext, '-' + ext + '.html'))
}

function copyLink(link) {
	let copyLinkMsg = 'Copy Share Link to Clipboard: Ctrl+C, Enter'
	if (window.isMobile)
		copyLinkMsg = 'Copy Share Link to Clipboard: Long Press Text, Select Copy'
	window.prompt(copyLinkMsg, link)
}

let listOrder = Date.now()

function loadIsotope() {
	isotopeLoaded = true
	window.iso = new Isotope('.grid', {
		  itemSelector: '.grid-item',
		  getSortData: {
		    bumps: itemElem => parseInt($(itemElem).find('.counter').text()),
		    alpha: '.item-title',
		  },
		  layoutMode: 'masonry',
		  fitWidth: true
	})
	window.iso.arrange({ sortBy: 'bumps', sortAscending: false })
	setTimeout(() => {
		$('.gallery-loader').remove()
		$('.grid').animate({ opacity: 1 }, 500)
		localStorage.setItem('order__list__' + listOrder, JSON.stringify({
			list: window.iso.filteredItems.map(el => $(el.element).attr('data-item'))
		}))
	})
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
let isotopeLoaded = false

$(window).on('load', function() {
	imagesLoaded = true
	if (bumpsLoaded)
		loadIsotope()
})

let allBumps = {}

$(document).ready(function() {
	$('.grid-item').each(function(ij) {
		$(this).find('a').attr('href', $(this).find('a').attr('href') + '?order=' + listOrder)
	})
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
		const item = $(this).attr('data-item')
		const shareLink = host + 'items/' + itemToHtmlPage(item)
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
	$('.mod-buttons').click(function(ev) {
		ev.preventDefault()
		if (!isotopeLoaded)
			return false
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
		} else if (filter == 'Show All') {
			window.iso.arrange({
			  filter: '*'
			})
		}
		setTimeout(() => {
			localStorage.setItem('order__list__' + listOrder, JSON.stringify({
				list: window.iso.filteredItems.map(el => $(el.element).attr('data-item'))
			}))
		})
		return false
	})
	$('.go-to-top').click(function(ev) {
		ev.preventDefault()
		$('html, body').animate({ scrollTop: 0 }, 'slow')
		return false
	})
	function switchItem(ev, direction) {
		ev.preventDefault()
		if (!$('.micromodal-slide').hasClass('is-open'))
			return false
		const key = $('.modal-' + (direction > 0 ? 'next' : 'prev') + '-button').attr('data-item')
		let newItem
		window.iso.filteredItems.some((el,ij) => {
			if ($(el.element).attr('data-item') == key) {
				if (window.iso.filteredItems[ij+direction])
					newItem = window.iso.filteredItems[ij+direction].element
				return true
			}
		})
		if (newItem) {
			const newKey = $(newItem).attr('data-item')
			window.location = host + 'items/' + itemToHtmlPage(newKey) + '?order=' + listOrder
		}
		return false
	}
	$('.modal-next-button').click(ev => { switchItem(ev, 1) })
	$('.modal-prev-button').click(ev => { switchItem(ev, -1) })
	$(document).keyup(function(ev) {
		if ($('.micromodal-slide').hasClass('is-open')) {
			if (ev.which == 39)
				switchItem(ev, 1)
			else if (ev.which == 37)
				switchItem(ev, -1)
			else if (ev.which == 32 && $('.micromodal-slide').hasClass('is-open'))
				$('.like-button.is-modal').click()
		}
	})

	$(document).on('swipeleft', ev => {
		if ($('.micromodal-slide').hasClass('is-open'))
			switchItem(ev, 1)
	})

	$(document).on('swiperight', ev => {
		if ($('.micromodal-slide').hasClass('is-open'))
			switchItem(ev, -1)
	})

	$('.modal__close').click(ev => {
		history.replaceState(null, null, host)
	})

	$('.modal__close').on('tap', () => {
		history.replaceState(null, null, host)
	})
})
