let body = document.querySelector('body');
let drawer = document.querySelector('#drawer');
let drawerOverlay = document.querySelector('#drawer-overlay');
let burger = document.querySelector('#burger');
let title_bar = document.querySelector('#title-bar');
let content = document.querySelector('main');
let profileDropdownBtn = document.querySelector('#profile-dropdown-btn');
let profileDropdown = document.querySelector('#profile-dropdown');

burger.addEventListener('click', e => {
    if(drawer.classList.contains('drawer-open')){
        // Drawer closed
        drawer.classList.remove('drawer-open');
        title_bar.classList.remove('width-open');
        drawerOverlay.classList.remove('overlay-show');
        document.querySelector('body').style.overflow = 'visible';
    }

    else{
        // Drawer opened
        drawer.classList.add('drawer-open');
        title_bar.classList.add('width-open');
        drawerOverlay.classList.add('overlay-show');
        document.querySelector('body').style.overflow = 'hidden';
    }
});

drawerOverlay.addEventListener('click', e => {
    if(drawer.classList.contains('drawer-open')){
        drawer.classList.remove('drawer-open');
        title_bar.classList.remove('width-open');
        drawerOverlay.classList.remove('overlay-show');
        document.querySelector('body').style.overflow = 'visible';
    }
});

profileDropdownBtn.addEventListener('click', e => {
    profileDropdown.classList.remove('hide-profile-dropdown');
});

body.addEventListener('click', e => {
    if(!profileDropdownBtn.contains(e.target)){
        profileDropdown.classList.add('hide-profile-dropdown');
    }
});
