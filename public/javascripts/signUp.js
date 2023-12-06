const back = document.querySelector('#back');
back.addEventListener('click', () => window.history.back());


const fileSearch = document.querySelector('#file_search');
const fileBoxInput = () => {
  const fileBoxInput = document.querySelector('#file_box');

  fileBoxInput.value = fileSearch.value;
};
fileSearch.addEventListener('change', fileBoxInput);


const email = document.querySelector('#email');
const name = document.querySelector('#name');
const password = document.querySelector('#password');
const rePassword = document.querySelector('#rePassword');
const nextBox = (e) => {
  if (e.key === 'Enter' || e.keyCode === 13) {
    const inputs = [email, name, password, rePassword, phone1];
    const currentInputIndex = inputs.indexOf(e.target);
    const nextInput = inputs[currentInputIndex + 1];

    nextInput.focus();
  }
};
email.addEventListener('keydown', nextBox);
name.addEventListener('keydown', nextBox);
password.addEventListener('keydown', nextBox);
rePassword.addEventListener('keydown', nextBox);


const phone1 = document.querySelector('#phone1');
const phone2 = document.querySelector('#phone2');
const phone3 = document.querySelector('#phone3');
const nextPhoneBox = (e) => {
  const reg = /\D/g;
  const inputValue = e.target.value.replace(reg, '');

  if (inputValue.length === 3) {
    phone2.focus();
  } else if (inputValue.length === 4) {
    phone3.focus();
  }
};
phone1.addEventListener('input', nextPhoneBox);
phone2.addEventListener('input', nextPhoneBox);


const tokenSend = document.querySelector('#token_send');
const nextTokenBox = (e) => {
  const reg = /\D/g;
  const inputValue = e.target.value.replace(reg, '');

  if (inputValue.length == 4) {
    tokenSend.disabled = false;
    tokenSend.style.color = '#222';
    tokenSend.style.border = '1px solid #D2D2D2';
    tokenSend.style.cursor = 'pointer';
    tokenSend.focus();
  }
};
phone3.addEventListener('input', nextTokenBox);


let timer;
const tokenInput = document.querySelector('#token_input');
const tokenCheck = document.querySelector('#token_check');
const tokenNumber = String(Math.floor(Math.random() * 1000000)).padStart(6, 0);
const sendTokenToUser = async () => {
  if (phone1.value.length !== 3 || phone2.value.length !== 4 || phone3.value.length !== 4) {
    alert('휴대폰 번호를 입력해 주세요.');
    return;
  }

  clearInterval(timer);

  // 인증 번호 문자로 보내기
  // await axios.post('/auth/authSendToken', {
  //   tokenNumber,
  //   phone1: phone1.value,
  //   phone2: phone2.value,
  //   phone3: phone3.value,
  // });
  console.log(tokenNumber);

  tokenCheck.disabled = false;
  tokenCheck.style = 'color: #222; cursor: pointer;';
  tokenInput.focus();

  let time = 60;
  timer = setInterval(() => {
    if (time >= 0) {
      const min = Math.floor(time / 60);
      const sec = String(time % 60).padStart(2, 0);
      const timeTimer = document.querySelector('#time_timer');

      timeTimer.innerText = min + ':' + sec;
      time = time - 1;
    } else {
      clearInterval(timer);

      tokenCheck.disabled = true;
      tokenCheck.style = 'color: internal-light-dark; cursor:default';
    }
  }, 1000);
};
tokenSend.addEventListener('click', sendTokenToUser);


const nextCheckBox = (e) => {
  const reg = /\D/g;
  const inputValue = e.target.value.replace(reg, '');

  if (inputValue.length == 6) {
    tokenCheck.focus();
  }
};
tokenInput.addEventListener('input', nextCheckBox);


const signUp = document.querySelector('#sign_up');
const checkSubmit = () => {
  if (tokenInput.value !== tokenNumber) {
    alert('올바르지 않은 인증 번호 입니다.');
    return;
  }

  clearInterval(timer);

  tokenCheck.innerText = '인증 완료';
  signUp.disabled = false;
  signUp.style = 'color: #222; cursor: pointer;';
  alert('인증이 완료되었습니다.');
  signUp.focus();
};
tokenCheck.addEventListener('click', checkSubmit);


const signUpSubmit = async () => {
  const errorFile = document.querySelector('#error_file');
  const errorEmail = document.querySelector('#error_email');
  const errorName = document.querySelector('#error_name');
  const errorPassword = document.querySelector('#error_password');
  const errorRePassword = document.querySelector('#error_rePassword');

  let isValid = true;

  if (!email.value || !email.value.includes('@')) {
    errorEmail.innerText = '이메일 형식이 올바르지 않습니다.';
    isValid = false;
  } else {
    const isEmail = await axios.get('/user/userFindOneWithEmail', {
      params: { email: email.value },
    });
    if (isEmail.data.email) {
      errorEmail.innerText = '이미 존재하는 이메일입니다.';
      isValid = false;
    } else {
      errorEmail.innerText = '';
    }
  }

  if (!name.value) {
    errorName.innerText = '별명이 올바르지 않습니다.';
    isValid = false;
  } else {
    const isName = await axios.get('/user/userFindOneWithName', {
      params: { name: name.value },
    });
    if (isName.data.name) {
      errorName.innerText = '중복되는 별명입니다.';
      isValid = false;
    } else {
      errorName.innerText = '';
    }
  }

  if (!password.value) {
    errorPassword.innerText = '비밀번호를 입력해 주세요.';
    isValid = false;
  } else {
    errorPassword.innerText = '';
  }

  if (!rePassword.value) {
    errorRePassword.innerText = '비밀번호를 입력해 주세요.';
    isValid = false;
  } else if (password.value !== rePassword.value) {
    errorRePassword.innerText = '비밀번호가 일치하지 않습니다.';
    isValid = false;
  } else {
    errorRePassword.innerText = '';
  }

  const file = fileSearch.files[0];
  if (!file) {
    errorFile.innerText = '사진을 업로드해 주세요.';
    isValid = false;
  } else {
    errorFile.innerText = '';
  }

  if (isValid) {
    const formData = new FormData();
    formData.append('file', file);

    signUp.disabled = true;
    signUp.style = 'color: internal-light-dark; cursor:default';

    try {
      const url = await axios.post('/file/fileUpload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await axios.post('/user/userCreate', {
        name: name.value,
        email: email.value,
        password: password.value,
        profileUrl: url.data,
      });

      alert('회원가입을 축하합니다.');
      window.location.href = '/signIn';
    } catch (err) {
      if (err.response.status === 400) {
        alert('회원 가입 중 오류가 발생했습니다. \n입력하신 정보를 다시 확인해 주세요.')
      } else {
        alert('회원 가입 중 오류가 발생했습니다. \n나중에 다시 시도해주세요.');
      }
    }
  } else {
    return;
  }
};
signUp.addEventListener('click', signUpSubmit);
