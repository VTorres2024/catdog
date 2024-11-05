const API_KEY = "API_KEY_HERE";
const SEARCH_ID = "GOOGLE_CUSTOM_SEARCH_ID_HERE";

var selected_query = null;
var request_on_course = false;
var current_page = 0;
var pages_at_once = 0;

function search_sel(query)
{
	let search_results = document.getElementById("search_results");
	let spinner = document.getElementById("spinner");
	let title = document.getElementById("title");

	if (!query)
	{
		alert("Introduzca un término de búsqueda");
		return;
	}

	selected_query = query;
	title.textContent = capitalizeFirstLetter(query);

	console.log("query set to", query);

	search_results.innerHTML = "";
	current_page = 1;
	pages_at_once = 0;

	window.onscroll = on_scroll;

	spinner.style.display = "";

	get_new_page();
}

function show_favs()
{
	let search_results = document.getElementById("search_results");
	let title = document.getElementById("title");

	selected_query = null;
	title.textContent = "Favoritos";
	search_results.innerHTML = "";

	window.onscroll = null;

	let favs_keys = get_favs_keys();
	let favs = favs_keys.map(x => localStorage.getItem(x));

	if (!favs.length)
	{
		search_results.innerHTML = "<p>No favorites :(</p>";
	}
	else
	{
		favs.map(JSON.parse).forEach(
			(fav, index) => {
				let item = add_search_item(fav);
				item.id = favs_keys[index];

				let del = item.querySelector(".DeleteButton");
				let like = item.querySelector(".LikeButton");

				like.hidden = true

				del.addEventListener("click", () => localStorage.removeItem(item.id) );
			});
	}
}

function get_favs_keys()
{
	return [...Array(localStorage.length).keys()].map(k => localStorage.key(k)).filter(k => k.startsWith("fav_")).sort()
}

function get_new_page()
{
	if (request_on_course)
	{
		console.log("request already in course");
		return;
	}

	request_on_course = true;

	if (pages_at_once >= 10)
	{
		console.log("done", pages_at_once, "pages at once! aborting...");
		request_on_course = false;
		return;
	}

	pages_at_once += 1;

	let spinner = document.getElementById("spinner");

	let api_url = "https://www.googleapis.com/customsearch/v1"
	let params = new URLSearchParams({
		key: API_KEY,
		cx: SEARCH_ID,
		alt: "json",
		searchType: "image",
		fileType: "jpeg,png,gif",
		q: selected_query,
		start: current_page,
	}).toString();

	let json_url = api_url + "?" + params;

	console.log("Querying", json_url);
	fetch(json_url).then(
		(json_page) => {
			console.log("Got response", json_page);

			if (!json_page.ok)
			{
				console.log("status", json_page.status);
				spinner.style.display = "none";
				request_on_course = false;
				throw 1;
			}

			json_page.json().then(
				(json) => {
					console.log("JSON response", json);

					if (!(json.error === undefined || json.error === null))
					{
						console.log("Got google error", json.error);
						request_on_course = false;
						spinner.style.display = "none";
						throw 1;
					}

					current_page += json.items.length;

					json.items.forEach(
						search_item => add_search_item(search_item)
					);

					request_on_course = false;
					spinner.style.display = "none";

					if (on_bottom())
					{
						console.log("still on bottom!");
						get_new_page();
					}
					else
						pages_at_once = 0;
				}
			).catch(
				err => {
					console.log("Error parsing response JSON", err)
					request_on_course = false;
					spinner.style.display = "none";
					throw err;
				}
			);
		}
	).catch(
		err => {
			console.log("Got error", err)
			request_on_course = false;
			spinner.style.display = "none";
			throw err;
		}
	);
}

function add_search_item(search_item)
{
	let search_results = document.getElementById("search_results");

	let item = document.createElement("div");
	item.classList.add("SearchItem");
	search_results.appendChild(item);

	let box = document.createElement("div");
	box.classList.add("SearchItemBox");
	item.appendChild(box);

	let title = document.createElement("a");
	title.classList.add("SearchItemTitle");
	title.textContent = search_item.title;
	title.href = extract_context_url(search_item);
	box.appendChild(title);

	let img = document.createElement("img");
	img.classList.add("SearchItemImg");
	set_item_img(img, search_item);
	box.appendChild(img);

	let actions = document.createElement("div");
	box.appendChild(actions);

	let like = document.createElement("button");
	like.classList.add("LikeButton");
	like.textContent = "Like!";
	like.addEventListener("click",  () => like_item(search_item) );
	actions.appendChild(like);

	let del = document.createElement("button");
	del.classList.add("DeleteButton");
	del.textContent = "Delete";
	del.addEventListener("click",  () => search_results.removeChild(item) );
	actions.appendChild(del);

	return item;
}

function like_item(search_item)
{
	console.log("liked", search_item);

	for (var i=localStorage.length; localStorage.getItem("fav_" + i) != null; ++i)
	{}

	localStorage.setItem("fav_" + i, JSON.stringify(search_item));
}

function extract_context_url(search_item)
{
	if (search_item.image !== null && search_item.image !== undefined)
	{
		if (search_item.image.contextLink !== null && search_item.image.contextLink !== undefined)
		{
			return search_item.image.contextLink;
		}
	}

	return search_item.link;
}

function set_item_img(img, search_item)
{
	img.src = search_item.link;

	img.onerror = function(){
		if (search_item.image !== null && search_item.image !== undefined)
		{
			if (search_item.image.thumbnailLink !== null && search_item.image.thumbnailLink !== undefined)
			{
				img.src = search_item.image.thumbnailLink;
			}
		}

		img.onerror = null;
	}
}

function on_bottom()
{
	return (window.innerHeight + window.pageYOffset) >= document.body.offsetHeight;
}

function on_scroll() {
	if (on_bottom()) {
		console.log("bottom hit");
		get_new_page();
	}
};

function capitalizeFirstLetter(str) {
	return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}


