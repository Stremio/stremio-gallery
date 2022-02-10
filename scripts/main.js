
MicroModal.init()

const print = new Fingerprint().get()

const artLoc = 'node_modules/stremio-art/'

function openModal(item) {
	const name = item.replace(/\.[^/.]+$/, "").split('-').join(' ')
	$('.modal__title').text(name)
	$('.modal__content a').attr('href', artLoc + 'originals/'+item)
	$('.modal__content a img').attr('src', artLoc + 'originals/'+item)
	$('.modal__footer .share-button').attr('data-item', item)
	$('.modal__footer .like-button').attr('data-item', item)
	// give a bit of time so we don't see the image flicker when we change it
	setTimeout(() => {
		MicroModal.show('modal-1')
	}, 200)
}

const urlParams = new URLSearchParams(window.location.search)

const shareParam = urlParams.get('share')

if (shareParam)
	openModal(shareParam)

function copyLink(link) {
	window.prompt("Copy Addon URL Clipboard: Ctrl+C, Enter", link)
}

$(document).ready(function() {
	fetch('https://bumper.stremio.workers.dev/get')
	  .then(response => response.json())
	  .then(data => {
	  	if (typeof data === 'object')
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
	  	setTimeout(() => {
			window.iso = new Isotope('.grid', {
				  itemSelector: '.grid-item',
				  getSortData: {
				    likes: '.counter'
				  },
				  layoutMode: 'masonry',
				  fitWidth: true
			});
			window.iso.arrange({ sortBy: 'likes', sortAscending: false });
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
		if ($(this).find('.user-buttons').hasClass('liked')) {
			if (localStorage && localStorage.getItem(item))
				localStorage.removeItem(item)
			const counter = $(this).parent().find('.counter')
			const count = parseInt(counter.text()) -1
			counter.text(count)
			$(this).find('.user-buttons').removeClass('liked')

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
			const counter = $(this).parent().find('.counter')
			const count = parseInt(counter.text()) +1
			counter.text(count)
			$(this).find('.user-buttons').addClass('liked')

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
})
