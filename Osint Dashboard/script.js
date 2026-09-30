const ipForm = document.querySelector("#ip-form");
const ipInput = document.querySelector("#ip-address");
const ipError = document.querySelector("#ip-error");
const lookupButton = document.querySelector("#lookup-button");
const resultsSection = document.querySelector("#ip-results");
const resultGrid = document.querySelector("#result-grid");
const resultIp = document.querySelector("#result-ip");

const blockedIpv4Ranges = [
	([first]) => first === 0,
	([first]) => first === 10,
	([first, second]) => first === 100 && second >= 64 && second <= 127,
	([first]) => first === 127,
	([first, second]) => first === 169 && second === 254,
	([first, second]) => first === 172 && second >= 16 && second <= 31,
	([first, second, third]) => first === 192 && second === 0 && third === 0,
	([first, second, third]) => first === 192 && second === 0 && third === 2,
	([first, second, third]) => first === 192 && second === 88 && third === 99,
	([first, second]) => first === 192 && second === 168,
	([first, second]) => first === 198 && (second === 18 || second === 19),
	([first, second, third]) => first === 198 && second === 51 && third === 100,
	([first, second, third]) => first === 203 && second === 0 && third === 113,
	([first]) => first >= 224
];

function parsePublicIpv4(value) {
	const parts = value.split(".");
	if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
		return null;
	}

	const octets = parts.map(Number);
	if (octets.some((octet) => octet < 0 || octet > 255)) {
		return null;
	}

	if (blockedIpv4Ranges.some((isBlocked) => isBlocked(octets))) {
		return null;
	}

	return octets.join(".");
}

function showError(message) {
	ipError.textContent = message;
	ipError.hidden = false;
	resultsSection.hidden = true;
}

function appendResult(label, value) {
	const item = document.createElement("div");
	item.className = "result-item";

	const term = document.createElement("dt");
	term.textContent = label;

	const description = document.createElement("dd");
	description.textContent = value || "Not provided";

	item.append(term, description);
	resultGrid.append(item);
}

function displayIpResult(data) {
	const location = data.city && data.region
		? `${data.city}, ${data.region}`
		: data.city || data.region || "Not provided";
	const fields = [
		["Location", location],
		["Country", data.country],
		["Country code", data.country_code],
		["Internet provider", data.connection?.isp],
		["Organization", data.connection?.org],
		["Autonomous system", data.connection?.asn],
		["Timezone", data.timezone?.id],
		["IP version", data.type]
	];

	resultIp.textContent = data.ip;
	resultGrid.replaceChildren();
	for (const [label, value] of fields) {
		appendResult(label, value);
	}
	resultsSection.hidden = false;
}

ipForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	ipError.hidden = true;
	resultsSection.hidden = true;

	const address = parsePublicIpv4(ipInput.value.trim());
	if (!address) {
		showError("Enter a valid, publicly routable IPv4 address. Private and reserved ranges are not queried.");
		ipInput.focus();
		return;
	}

	lookupButton.disabled = true;
	lookupButton.querySelector("span").textContent = "Looking up...";
	try {
		const response = await fetch(`https://ipwho.is/${encodeURIComponent(address)}`, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(12000)
		});
		if (!response.ok) {
			throw new Error("The lookup service is unavailable. Try again shortly.");
		}

		const data = await response.json();
		if (!data.success || data.ip !== address) {
			throw new Error("No public network details were returned for that address.");
		}

		displayIpResult(data);
	} catch (error) {
		showError(error.name === "TimeoutError"
			? "The lookup timed out. Try again shortly."
			: error.message || "The lookup could not be completed. Check your connection and try again.");
	} finally {
		lookupButton.disabled = false;
		lookupButton.querySelector("span").textContent = "Run lookup";
	}
});

document.querySelectorAll(".nav-link").forEach((link) => {
	link.addEventListener("click", () => {
		document.querySelectorAll(".nav-link").forEach((item) => {
			item.classList.remove("is-active");
			item.removeAttribute("aria-current");
		});
		link.classList.add("is-active");
		link.setAttribute("aria-current", "page");
	});
});
