"use strict";

const form = document.getElementById("auth-form");
const alertBox = document.getElementById("form-alert");
const submitButton = document.getElementById("submit-button");
const submitLabel = document.getElementById("submit-label");

let mode = "login";

function setMode(nextMode) {
	mode = nextMode === "signup" ? "signup" : "login";
	const isSignup = mode === "signup";

	document.getElementById("name-field").hidden = !isSignup;
	document.getElementById("confirm-field").hidden = !isSignup;
	document.getElementById("login-options").hidden = isSignup;
	document.getElementById("password-hint").hidden = !isSignup;
	document.getElementById("name").required = isSignup;
	document.getElementById("confirm-password").required = isSignup;
	document.getElementById("password").autocomplete = isSignup ? "new-password" : "current-password";
	document.getElementById("form-kicker").textContent = isSignup ? "START BUILDING YOUR STORY" : "WELCOME BACK";
	document.getElementById("form-title").textContent = isSignup ? "Your next chapter starts here." : "Good to see you.";
	document.getElementById("form-description").textContent = isSignup
		? "Create your account and give your work a place to shine."
		: "Sign in to pick up where your next project begins.";
	submitLabel.textContent = isSignup ? "Create my account" : "Sign in";
	document.getElementById("mode-prompt").innerHTML = isSignup
		? 'Already have an account? <button class="text-button" type="button" data-mode="login">Sign in</button>'
		: 'New here? <button class="text-button" type="button" data-mode="signup">Create an account</button>';

	document.querySelectorAll(".mode-tab").forEach((tab) => {
		const active = tab.dataset.mode === mode;
		tab.classList.toggle("is-active", active);
		tab.setAttribute("aria-selected", String(active));
	});
	clearAlert();
}

function showAlert(message, type = "error") {
	alertBox.textContent = message;
	alertBox.dataset.type = type;
	alertBox.hidden = false;
}

function clearAlert() {
	alertBox.textContent = "";
	alertBox.hidden = true;
	document.querySelectorAll("#auth-form input").forEach((input) => input.removeAttribute("aria-invalid"));
}

function validateForm() {
	clearAlert();
	const email = document.getElementById("email");
	const password = document.getElementById("password");

	if (new TextEncoder().encode(password.value).length > 72) {
		password.setAttribute("aria-invalid", "true");
		showAlert("Password must be no more than 72 bytes.");
		password.focus();
		return false;
	}

	if (mode === "signup") {
		const name = document.getElementById("name");
		const confirm = document.getElementById("confirm-password");
		if (name.value.trim().length < 2) {
			name.setAttribute("aria-invalid", "true");
			showAlert("Please enter your name (at least 2 characters).");
			name.focus();
			return false;
		}
		if (password.value.length < 8) {
			password.setAttribute("aria-invalid", "true");
			showAlert("Choose a password with at least 8 characters.");
			password.focus();
			return false;
		}
		if (password.value !== confirm.value) {
			confirm.setAttribute("aria-invalid", "true");
			showAlert("Those passwords don’t match. Please try again.");
			confirm.focus();
			return false;
		}
	}

	if (!email.validity.valid) {
		email.setAttribute("aria-invalid", "true");
		showAlert("Enter a valid email address.");
		email.focus();
		return false;
	}
	if (!password.value) {
		password.setAttribute("aria-invalid", "true");
		showAlert("Enter your password to continue.");
		password.focus();
		return false;
	}
	return true;
}

async function submitAuth(event) {
	event.preventDefault();
	if (!validateForm()) return;

	const isSignup = mode === "signup";
	const email = document.getElementById("email").value.trim().toLowerCase();
	const enteredName = document.getElementById("name").value.trim();
	let demoProfiles = [];
	try {
		demoProfiles = JSON.parse(localStorage.getItem("btr_demo_profiles") || "[]");
	} catch {
		demoProfiles = [];
	}
	const existingProfile = demoProfiles.find(profile => profile.email === email);
	const name = isSignup
		? enteredName
		: existingProfile?.name || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, character => character.toUpperCase());

	if (isSignup) {
		demoProfiles = demoProfiles.filter(profile => profile.email !== email);
		demoProfiles.push({ name, email });
		localStorage.setItem("btr_demo_profiles", JSON.stringify(demoProfiles));
	}

	submitButton.disabled = true;
	submitLabel.textContent = isSignup ? "Creating your account…" : "Signing you in…";
	clearAlert();

	// Demo mode: intentionally do not send or persist passwords and do not call an API.
	localStorage.setItem("btr_auth_mode", "demo");
	localStorage.setItem("btr_token", "demo-session");
	localStorage.setItem("btr_user", JSON.stringify({ name, email }));
	showAlert(isSignup ? "Demo account created. Opening your workspace…" : "Demo sign-in complete. Opening your workspace…", "success");
	window.setTimeout(() => window.location.assign("frontend/project.html"), 250);
}

document.addEventListener("click", (event) => {
	const modeButton = event.target.closest("[data-mode]");
	if (modeButton) setMode(modeButton.dataset.mode);

	const revealButton = event.target.closest("[data-reveal]");
	if (revealButton) {
		const input = document.getElementById(revealButton.dataset.reveal);
		const reveal = input.type === "password";
		input.type = reveal ? "text" : "password";
		revealButton.textContent = reveal ? "Hide" : "Show";
		revealButton.setAttribute("aria-label", `${reveal ? "Hide" : "Show"} ${input.id === "password" ? "password" : "confirm password"}`);
	}
});

form.addEventListener("submit", submitAuth);
document.getElementById("current-year").textContent = new Date().getFullYear();
