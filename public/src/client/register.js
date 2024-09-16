'use strict';


define('forum/register', [
    'translator', 'slugify', 'api', 'bootbox', 'forum/login', 'zxcvbn', 'jquery-form',
], function (translator, slugify, api, bootbox, Login, zxcvbn) {
    const Register = {};
    let validationError = false;
    const successIcon = '';

    Register.init = function () {
        const username = $('#username');
        const password = $('#password');
        const password_confirm = $('#password-confirm');
        const register = $('#register');

        handleLanguageOverride();

        $('#content #noscript').val('false');

        const query = utils.params();
        if (query.token) {
            $('#token').val(query.token);
        }

        // Update the "others can mention you via" text
        username.on('keyup', function () {
            $('#yourUsername').text(this.value.length > 0 ? slugify(this.value) : 'username');
        });

        username.on('blur', function () {
            if (username.val().length) {
                validateUsername(username.val());
            }
        });

        password.on('blur', function () {
            if (password.val().length) {
                validatePassword(password.val(), password_confirm.val());
            }
        });

        password_confirm.on('blur', function () {
            if (password_confirm.val().length) {
                validatePasswordConfirm(password.val(), password_confirm.val());
            }
        });

        function validateForm(callback) {
            validationError = false;
            validatePassword(password.val(), password_confirm.val());
            validatePasswordConfirm(password.val(), password_confirm.val());
            validateUsername(username.val(), callback);
        }

        // Guard against caps lock
        Login.capsLockCheck(document.querySelector('#password'), document.querySelector('#caps-lock-warning'));

        register.on('click', function (e) {
            const registerBtn = $(this);
            const errorEl = $('#register-error-notify');
            errorEl.addClass('hidden');
            e.preventDefault();
            validateForm(function () {
                if (validationError) {
                    return;
                }

                registerBtn.addClass('disabled');

                registerBtn.parents('form').ajaxSubmit({
                    headers: {
                        'x-csrf-token': config.csrf_token,
                    },
                    success: function (data) {
                        registerBtn.removeClass('disabled');
                        if (!data) {
                            return;
                        }
                        if (data.next) {
                            const pathname = utils.urlToLocation(data.next).pathname;
                            window.location.href = pathname;
                        }
                    },
                    error: function (xhr) {
                        registerBtn.removeClass('disabled');
                        const error = xhr.responseJSON && xhr.responseJSON.message;
                        if (error && error.includes('[[error:username-taken-suggestion')) {
                            const suggestedUsername = error.split(',')[1].trim();
                            showError(errorEl, `Username is taken. How about "${suggestedUsername}"?`);
                        } else {
                            showError(errorEl, error || 'An unknown error occurred');
                        }
                    },
                });
            });
        });

        function validateUsername(username, callback) {
            const username_notify = $('#username-notify');
            if (!username) {
                showError(username_notify, '[[error:invalid-username]]');
                return callback();
            }

            api.head(`/user/${slugify(username)}`, {}, (err, status) => {
                if (status === 404) {
                    showSuccess(username_notify, successIcon);
                } else {
                    showError(username_notify, '[[error:username-taken]]');
                }
                callback();
            });
        }

        function validatePassword(password, password_confirm) {
            const password_notify = $('#password-notify');
            const password_confirm_notify = $('#password-confirm-notify');

            try {
                utils.assertPasswordValidity(password, zxcvbn);

                if (password === $('#username').val()) {
                    throw new Error('[[user:password_same_as_username]]');
                }

                showSuccess(password_notify, successIcon);
            } catch (err) {
                showError(password_notify, err.message);
            }

            if (password !== password_confirm && password_confirm !== '') {
                showError(password_confirm_notify, '[[user:change_password_error_match]]');
            }
        }

        function validatePasswordConfirm(password, password_confirm) {
            const password_notify = $('#password-notify');
            const password_confirm_notify = $('#password-confirm-notify');

            if (!password || password_notify.hasClass('alert-error')) {
                return;
            }

            if (password !== password_confirm) {
                showError(password_confirm_notify, '[[user:change_password_error_match]]');
            } else {
                showSuccess(password_confirm_notify, successIcon);
            }
        }

        function showError(element, msg) {
            translator.translate(msg, function (msg) {
                element.html(msg);
                element.parent()
                    .removeClass('register-success')
                    .addClass('register-danger');
                element.show();
            });
            validationError = true;
        }

        function showSuccess(element, msg) {
            translator.translate(msg, function (msg) {
                element.html(msg);
                element.parent()
                    .removeClass('register-danger')
                    .addClass('register-success');
                element.show();
            });
        }

        function handleLanguageOverride() {
            if (!app.user.uid && config.defaultLang !== config.userLang) {
                const formEl = $('[component="register/local"]');
                const langEl = $('<input type="hidden" name="userLang" value="' + config.userLang + '" />');

                formEl.append(langEl);
            }
        }
    };

    return Register;
});
