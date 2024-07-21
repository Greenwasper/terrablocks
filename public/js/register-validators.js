function unvalidated (unvalidatedMsg, referenceElement){

    let validatorDiv = referenceElement.parentElement.parentElement;
    let inputElement = validatorDiv.querySelector('input');
    let validatorElement = validatorDiv.querySelector('.validator');

    validatorElement.textContent = unvalidatedMsg;

    inputElement.classList.add('unverified-input');

    return false;
}

function validated(referenceElement){
    let validatorDiv = referenceElement.parentElement.parentElement;
    let inputElement = validatorDiv.querySelector('input');
    let validatorElement = validatorDiv.querySelector('.validator');

    validatorElement.textContent = '';
    inputElement.classList.remove('unverified-input');

    return true;
}

function nameValidator (e){
    if(e.value.length <= 0){
        return unvalidated('Field must not be empty', e);
    }

    else if(/\d/.test(e.value)){
        return unvalidated('Field must not contain numbers', e);
    }

    else if(/[!@#$%^&*(),.?":{}|<>]/g.test(e.value)){
        return unvalidated('Field must not contain special characters', e);
    }

    return validated(e);
}

function nameValidatorEmpty (e){
    if(/\d/.test(e.value)){
        return unvalidated('Field must not contain numbers', e);
    }

    else if(/[!@#$%^&*(),.?":{}|<>]/g.test(e.value)){
        return unvalidated('Field must not contain special characters', e);
    }

    return validated(e);
}

function emailValidator (e){
    const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(e.value.length <= 0){
        return unvalidated('Field must not be empty', e);
    }

    else if(!String(e.value).toLowerCase().match(regex)){
        return unvalidated("Field must contain a valid email", e);
    }

    // return validated(e);
}

function phoneValidator (e){
    if(!e.hasAttribute('phone-is-valid')){
        return unvalidated('Invalid phone number', e.parentElement);
    }

    return validated(e.parentElement);
}

function passwordValidator (e){
    if(e.value.length <= 0){
        return unvalidated('Field must not be empty', e);
    }

    else if(e.value.length < 8){
        return unvalidated('Password must contain at least 8 characters', e);
    }

    return validated(e);
}

function confirmPasswordValidator (e){
    if(e.value.length <= 0){
        return unvalidated('Field must not be empty', e);
    }

    else if(e.value != document.querySelector('#password').value){
        return unvalidated('Passwords do not match', e);
    }

    return validated(e);
}

const event = new Event('input', {
    bubbles: true,
    cancelable: true,
});

const customEvent = new Event('pause', {
    bubbles: true,
    cancelable: true
});

function validateAll () {
    let validationNumber = 0;
    Array.from(document.querySelectorAll('.validate-field')).forEach(element => {
        let input = element.querySelector('.validate-field input');
        let validator = element.querySelector('.validator');
        if(input.getAttribute('id') != 'phone'){
            input.dispatchEvent(event);
        }
        input.dispatchEvent(customEvent);
        if(validator.textContent != ''){
            validationNumber++;
        }
    });
    
    console.log(validationNumber);

    return validationNumber == 0;
}