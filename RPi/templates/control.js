var robot_name, cmd_movition_ctrl, max_speed, slow_speed;
var cmd_gimbal_ctrl, cmd_gimbal_steady, cmd_arm_ctrl_ui;
var max_rate, mid_rate, min_rate, arm_default_e, arm_default_r, arm_default_z; 
var max_res, mid_res, min_res; 
var zoom_x1, zoom_x2, zoom_x4;
var pic_cap, vid_sta, vid_end;
var mc_lock, mc_unlo;
var cv_none, cv_moti, cv_face, cv_objs, cv_clor, mp_hand, cv_auto;
var mp_face, mp_pose;
var re_none, re_capt, re_reco, led_off, led_aut, led_ton, base_of, base_on;
var head_ct, base_ct;
var s_panid, release, set_mid, s_tilid;
var armZ, armR, armE;

var detect_type, led_mode, detect_react, picture_size, video_size, cpu_load;
var cpu_temp, ram_usage, pan_angle, tilt_angle, wifi_rssi, base_voltage, video_fps;
var cv_movtion_mode, base_light;

fetch('/config')
  .then(response => response.text())
  .then(yamlText => {
    try {
      const yamlObject = jsyaml.load(yamlText);
      cmd_movition_ctrl = yamlObject.cmd_config.cmd_movition_ctrl;
      cmd_gimbal_steady = yamlObject.cmd_config.cmd_gimbal_steady;
      cmd_gimbal_ctrl = yamlObject.cmd_config.cmd_gimbal_ctrl;
      cmd_arm_ctrl_ui = yamlObject.cmd_config.cmd_arm_ctrl_ui;

      max_speed = yamlObject.args_config.max_speed;
      slow_speed = yamlObject.args_config.slow_speed;
      robot_name = yamlObject.base_config.robot_name;

      max_rate  = yamlObject.args_config.max_rate;
      mid_rate  = yamlObject.args_config.mid_rate;
      min_rate  = yamlObject.args_config.min_rate;
      arm_default_e = yamlObject.args_config.arm_default_e;
      arm_default_z = yamlObject.args_config.arm_default_z;
      arm_default_r = yamlObject.args_config.arm_default_r;
      armZ = arm_default_z; 
      armR = arm_default_r;
      armE = arm_default_e;

      main_type = yamlObject.base_config.main_type;
      module_type = yamlObject.base_config.module_type;

      max_res = yamlObject.code.max_res;
      mid_res = yamlObject.code.mid_res;
      min_res = yamlObject.code.min_res;

      zoom_x1 = yamlObject.code.zoom_x1;
      zoom_x2 = yamlObject.code.zoom_x2;
      zoom_x4 = yamlObject.code.zoom_x4;

      pic_cap = yamlObject.code.pic_cap;
      vid_sta = yamlObject.code.vid_sta;
      vid_end = yamlObject.code.vid_end;

      mc_lock = yamlObject.code.mc_lock;
      mc_unlo = yamlObject.code.mc_unlo;

      cv_none = yamlObject.code.cv_none;
      cv_moti = yamlObject.code.cv_moti;
      cv_face = yamlObject.code.cv_face;
      cv_objs = yamlObject.code.cv_objs;
      cv_clor = yamlObject.code.cv_clor;
      mp_hand = yamlObject.code.mp_hand;
      cv_auto = yamlObject.code.cv_auto;
      mp_face = yamlObject.code.mp_face;
      mp_pose = yamlObject.code.mp_pose;

      re_none = yamlObject.code.re_none;
      re_capt = yamlObject.code.re_capt;
      re_reco = yamlObject.code.re_reco;
      led_off = yamlObject.code.led_off;
      led_aut = yamlObject.code.led_aut;
      led_ton = yamlObject.code.led_ton;
      base_of = yamlObject.code.base_of;
      base_on = yamlObject.code.base_on;
      head_ct = yamlObject.code.head_ct;
      base_ct = yamlObject.code.base_ct;

      s_panid = yamlObject.code.s_panid;
      release = yamlObject.code.release;
      set_mid = yamlObject.code.set_mid;
      s_tilid = yamlObject.code.s_tilid;

      detect_type = yamlObject.fb.detect_type;
      led_mode    = yamlObject.fb.led_mode;
      detect_react= yamlObject.fb.detect_react;
      picture_size= yamlObject.fb.picture_size;
      video_size  = yamlObject.fb.video_size;
      cpu_load    = yamlObject.fb.cpu_load;
      cpu_temp    = yamlObject.fb.cpu_temp;
      ram_usage   = yamlObject.fb.ram_usage;
      pan_angle   = yamlObject.fb.pan_angle;
      tilt_angle  = yamlObject.fb.tilt_angle;
      wifi_rssi   = yamlObject.fb.wifi_rssi;
      base_voltage= yamlObject.fb.base_voltage;
      video_fps   = yamlObject.fb.video_fps;
      cv_movtion_mode = yamlObject.fb.cv_movtion_mode;
      base_light  = yamlObject.fb.base_light;

      if (robot_name) {
        document.title = robot_name + " WEB CTRL";
      }
    } catch (e) {
      console.error('Error parsing YAML file:', e);
    }
  })
  .catch(error => {
    console.error('Error fetching YAML file:', error);
  });

//update photos list
function generatePhotoLink(imgname) {
    var strippedname = imgname.replace("photo_", "").replace(".jpg", "");
    var photoLink = '<li><a target="_blank" href="./pictures/' + imgname + '" ><img class="photo_img" data-filename="' +imgname + '" src="./pictures/' + imgname + '" /></a>';
    photoLink += '<p>' + strippedname + '</p>';
    photoLink += '<div class="delete_btn"><button class="normal_btn delete_btn_size normal_btn_del btn_ico"></button></div></li>';
    return photoLink;
}
function updatePhotoNames() {
    $.get('/get_photo_names', function(data) {
        var photoLinks = '';
        if (window.location.pathname === '/') {
            for (var i = 0; i < Math.min(6,data.length); i++) {
                var name = data[i];
                photoLinks += generatePhotoLink(name);
            }
            $('#photo-list').html(photoLinks);
        } else {
            for (var i = 0; i < data.length; i++) {
                var name = data[i];
                photoLinks += generatePhotoLink(name);
            }
            $('#photo-list').html(photoLinks);
        }
        $("#number-photos").text(data.length);
        //delete photo
        $("#photo-list li button").on("click", function () {
        var filename = $(this).closest("li").find("img.photo_img").data('filename');
        $.post('/delete_photo', { filename: filename }, function(response) {
            if (response.success) {
                updatePhotoNames();
            } else {
                alert("Failed to delete the file.");
            }
        });
    });
    });
}
updatePhotoNames();
// setInterval(updatePhotoNames, 2000);

function captureAndUpdate() {
    cmdSend(pic_cap,0,0);
    setTimeout(updatePhotoNames, 2000)
}

//show videos tips
function showVideosTips(){
    var videostipsbox =  $("#video-del-tips");
    videostipsbox.css("opacity", "1");
    videostipsbox.css("transform", `translate(-50%, -100%)`);
    setTimeout(function() {
        videostipsbox.removeAttr("style");
    }, 2000);
}

//update videos list
function generateVideoLink(vname) {
    var strippedname = vname.replace("video_", "").replace(".mp4", "");
    var videoList = '<li><a target="_blank" data-filename="' + vname + '" href="./videos/' + vname +'">';
    videoList += '<p>' + strippedname + '</p>';
    videoList += '<div><div class="delete_btn_size normal_btn_play btn_ico"></div></div></a>';
    videoList += '<div class="delete_btn"><div class="delete_btn_size normal_btn_del btn_ico"></div></div></li>';
    return videoList;
}
function updateVideoList() {
    $.get('/get_video_names', function(data) {
        var videosLists = '';
        if (window.location.pathname === '/') {
            for (var i = 0; i < Math.min(6,data.length); i++) {
                var name = data[i];
                videosLists += generateVideoLink(name);
            }
            $('#video-list').html(videosLists);
        } else {
            for (var i = 0; i < data.length; i++) {
                var name = data[i];
                videosLists += generateVideoLink(name);
            }
            $('#video-list').html(videosLists);
        }
        $("#number-videos").text(data.length);
        //delete videos
        $("#video-list li div.normal_btn_del").on("click", function () {
        var filename = $(this).closest("li").find("a").data('filename');
        $.post('/delete_video', { filename: filename }, function(response) {
            if (response.success) {
                updateVideoList();
                showVideosTips();
            } else {
                alert("Failed to delete the video.");
                }
            });
        });
    });
}
updateVideoList();


//video pixel
var listItems = $("#video_pixel_btn_list").children("li");
listItems.on("click", function () {
    var innertext = $(this).text();
    $("#video_pixel_btn").text(innertext);
    $("#video_pixel_btn_list").css("display", "none");
    setTimeout(function () {
        $("#video_pixel_btn_list").removeAttr("style");
    }, 10);  
});

//record function
var isRecording = false;
var originalText = "Record";
var timerInterval;
var seconds = 0;
var minutes = 0;
function updateTimer() {
    seconds++;
    if (seconds === 60) {
        seconds = 0;
        minutes++;
    }
    var formattedTime = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    $("#record-btn").text(formattedTime);
}
$(document).ready(function () {
    $("#record-btn").click(function () {
        if (!isRecording) {
            cmdSend(vid_sta,0,0);
            $(this).css("color", "#FF8C8C");
            $(this).removeClass("video_btn_record");
            $(this).addClass("video_btn_stop");
            isRecording = true;
            $(this).text("00:00");
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            cmdSend(vid_end,0,0);
            $(this).removeClass("video_btn_stop");
            $(this).addClass("video_btn_record");
            $(this).text(originalText);
            isRecording = false;
            clearInterval(timerInterval);
            seconds = 0;
            minutes = 0;
            $(this).css("color", "");
            updateVideoList();
        }
    });
});

//zoom
var zoomx = 1;
$("#zoom_btn").click(function(){
    var zoomNum  = document.getElementById("zoom-num");
    switch(zoomx){
        case 0: cmdSend(zoom_x1,0,0);
        zoomNum.innerHTML = "1x" 
        break;
        case 1: cmdSend(zoom_x2,0,0);
        zoomNum.innerHTML = "2x" 
        break;
        case 2: cmdSend(zoom_x4,0,0);
        zoomNum.innerHTML = "4x" 
        break;
    }
    zoomx = (zoomx + 1) % 3;
});

//joy stick function
var largeCircle = $("#ctrl_base");
var smallCircle = $("#ctrl_base div");
var minifyTimeout;
var isEnlarged = false;
var isMouseUp = false;
function enlargeJoyStick(){
    setTimeout(() => {
        isEnlarged = true;
    }, 98);
    largeCircle.removeClass("ctrl_base_s");
    smallCircle.removeClass("ctrl_stick_s");
    largeCircle.addClass("ctrl_base_l");
    smallCircle.addClass("ctrl_stick_l");
}
function minifyJoyStick(){
    isEnlarged = false;
    isMouseUp = false;
    largeCircle.removeClass("ctrl_base_l");
    smallCircle.removeClass("ctrl_stick_l");
    largeCircle.addClass("ctrl_base_s");
    smallCircle.addClass("ctrl_stick_s");
    
}
largeCircle.on("click", function(e){
    clearTimeout(minifyTimeout);
    enlargeJoyStick();
});

largeCircle.on("mousedown touchstart", function(){
    isMouseUp = false;
    clearTimeout(minifyTimeout);
    enlargeJoyStick();
});
$(document).on("mouseup touchend", function(){
    isMouseUp = true;
    if (isEnlarged) {
        minifyTimeout = setTimeout(minifyJoyStick, 2000);
    }
});
largeCircle.on("mouseenter", function(){
    clearTimeout(minifyTimeout);
});
largeCircle.on("mouseleave", function() {
    if (isMouseUp && isEnlarged) {
        minifyTimeout = setTimeout(minifyJoyStick, 2000);
    }
});


const base = document.getElementById('ctrl_base');
const stick = document.getElementById('ctrl_stick');
let isDragging = false;
let stickStartX = 0;
let stickStartY = 0;

var stickSendX = 0;
var stickSendY = 0;

var stickLastX = 0;
var stickLastY = 0;
// JoyStick actions for pc
try {
    stick.addEventListener('mousedown', (e) => {
        isDragging = true;
        stick.style.transition = 'none';
        const stickRect = stick.getBoundingClientRect();
        stickStartX = e.clientX - stickRect.left - stickRect.width / 2;
        stickStartY = e.clientY - stickRect.top - stickRect.height / 2;
        stickLastX = stickSendX;
        stickLastY = stickSendY;
    });
} catch(e) {
    console.log(e);
}
document.addEventListener('mousemove', (e) => {
    if (isDragging && isEnlarged) {
        moveStick(e);
    }
});
document.addEventListener('mouseup', () => {
    isDragging = false;
    try {
        stick.style.transition = '0.3s ease-out';
        stick.style.transform = 'translate(-50%, -50%)';
        base.style.border = '';
    } catch(e) {
        console.log(e);
    }
});
// JoyStick actions for mobile devices
try {
    stick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        stick.style.transition = 'none';
        const touch = e.touches[0];
        const stickRect = stick.getBoundingClientRect();
        stickStartX = touch.clientX - stickRect.left - stickRect.width / 2;
        stickStartY = touch.clientY - stickRect.top - stickRect.height / 2;
        stickLastX = stickSendX;
        stickLastY = stickSendY;
    });
} catch(e) {
    console.log(e);
}
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging && isEnlarged) {
        const touch = e.touches[0];
        moveStick(touch);
    }
});
try {
    stick.addEventListener('touchend', (e) => {
        //e.preventDefault();
        isDragging = false;
        stick.style.transition = '0.3s ease-out';
        stick.style.transform = 'translate(-50%, -50%)';
        base.style.border = '';
    });
} catch(e) {
    console.log(e);
}
function moveStick(event) {
    const baseRect = base.getBoundingClientRect();
    const stickRect = stick.getBoundingClientRect();
    const baseRectHalfW = baseRect.width / 2;
    const baseRectHalfH = baseRect.height / 2;

    const centerX = baseRect.left + baseRectHalfW;
    const centerY = baseRect.top + baseRectHalfH;

    const deltaX = event.clientX - centerX - stickStartX;
    const deltaY = event.clientY - centerY - stickStartY;

    const distance = Math.min(baseRectHalfW, Math.sqrt(deltaX ** 2 + deltaY ** 2));
    const angle = Math.atan2(deltaY, deltaX);

    const stickX = centerX + distance * Math.cos(angle);
    const stickY = centerY + distance * Math.sin(angle);

    const stickmovex = stickX - centerX - stickRect.width /2;
    const stickmovey = stickY - centerY - stickRect.height /2;

    stick.style.transform = `translate(${stickmovex}px, ${stickmovey}px)`;

    if (distance == baseRect.width / 2) {
        base.style.border = '2px solid #4FF5C0';
    } else {
        base.style.border = '';
    }

    stickSendX = stickLastX + deltaX;
    stickSendY = stickLastY + deltaY;

    // joyStickCtrl(deltaX, deltaY);
    joyStickCtrl(stickSendX, stickSendY);
}


function pointInCircle(radius, x, y) {
    var distance = Math.sqrt(x * x + y * y);

    if (distance <= radius) {
        return { x: x, y: y };
    } else {
        var angle = Math.atan2(y, x);
        var newX = radius * Math.cos(angle);
        var newY = radius * Math.sin(angle);
        return { x: newX, y: newY };
    }
}
document.addEventListener('mousewheel', (e) => {
    if (isDragging && isEnlarged) {
        var delta = e.deltaY || e.detail || e.wheelDelta;
        e.preventDefault();
        if (delta > 0) {
            // console.log("down");
            armE = armE - 5;
            if (armE < 60) {
                armE = 60;
            }
        } else {
            // console.log("up");
            armE = armE + 5;
            if (armE > 450) {
                armE = 450;
            }
        }
        // cmdSend(145, stickExtend, 0);
        var armLimit = pointInCircle(510, armE, armZ);
        armE = armLimit.x;
        armZ = armLimit.y;
        cmdJsonCmd({"T":cmd_arm_ctrl_ui,"E":armE,"Z":armZ,"R":armR});
    }
}, { passive: false });
function joyStickCtrl(inputX, inputY) {
    if (module_type == 1) {
        var x_cmd = Math.max(-180, Math.min(inputX/7, 180));
        // cmdSend(144, -inputX/7, -inputY/2);
        var armLimit = pointInCircle(510, armE, -inputY/2);
        armE = armLimit.x;
        armZ = armLimit.y;
        armR = -inputX/7;
        cmdJsonCmd({"T":cmd_arm_ctrl_ui,"E":armE,"Z":armZ,"R":armR});

        RotateAngle = document.getElementById("Pan").innerHTML = x_cmd.toFixed(2);
        var panScale = document.getElementById("pan_scale");
        panScale.style.transform = `rotate(${-RotateAngle}deg)`;
    } else {
        if (steady_mode == true) {
            inputX = 0;
        }
        var x_cmd = Math.max(-180, Math.min(inputX/2.5, 180));
        var y_cmd = Math.max(-30, Math.min(-inputY/2.5, 90));

        if (steady_mode == false) {
            cmdJsonCmd({"T":cmd_gimbal_ctrl,"X":inputX/2.5,"Y":-inputY/2.5,"SPD":0,"ACC":128});
        } else {
            steadyCtrl(1, inputY);
        }

        RotateAngle = document.getElementById("Pan").innerHTML = x_cmd.toFixed(2);
        var panScale = document.getElementById("pan_scale");
        panScale.style.transform = `rotate(${-RotateAngle}deg)`;

        var tiltNum = document.getElementById("Tilt");
        var tiltNumPanel = tiltNum.getBoundingClientRect();
        var tiltNumMove = tiltNum.innerHTML = y_cmd.toFixed(2);;

        var pointer = document.getElementById('tilt_scale_pointer');
        var tiltScaleOut = document.getElementById('tilt_scale');
        var tiltScaleBase = tiltScaleOut.getBoundingClientRect();
        var tiltScalediv = document.getElementById('tilt_scalediv');
        var tiltScaleDivBase = tiltScalediv.getBoundingClientRect();
        var pointerMoveY = tiltScaleBase.height/135;
        pointer.style.transform = `translate(${tiltScaleDivBase.width}px, ${pointerMoveY*(90 - tiltNumMove)-tiltNumPanel.height/2}px)`;
    }
}


//seetting page
function confirmSetPanID() {
    if (confirm("Make sure that you have already DISCONNECT the wire of the Tilt Servo")) {
        cmdSend(s_panid, 0, 0);
    }
}
function confirmRelease() {
    if (confirm("You will unlock the torque lock, then you can manually adjust the angle of the two servos.")) {
        cmdSend(release, 0, 0);
    }
}
function confirmMiddleSet() {
    if (confirm("Set the current position as the middle position.")) {
        cmdSend(set_mid, 0, 0);
    }
}
function confirmSetTiltID() {
    if (confirm("If you didn't disconnect the Tilt Servo in step 1, then both servo IDs will be set to 2 after you click the [Set Pan ID] button. Only in this case, you need to click [Set Tilt ID] to restore both servo IDs to 1, then repeat the entire setup process!")) {
        cmdSend(s_tilid, 0, 0);
    }
}




function cmdFill(rawInfo, fillInfo) {
    document.getElementById(rawInfo).value = document.getElementById(fillInfo).innerHTML;
}

function jsonSendFb() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          document.getElementById("fbInfo").innerHTML =
          this.responseText;
        }
    };
    xhttp.open("GET", "jsfb", true);
    xhttp.send();
}
function jsonSend() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "js?json="+document.getElementById('jsonData').value, true);
    xhttp.send();
    jsonSendFb();
}


//remove buttons class
function removeButtonsClass(buttons) {
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("ctl_btn_active");
    }
}
//remove all ico class
function removeAllIcoClass(ElName){
    while (ElName.classList.length > 0) {
        ElName.classList.remove(ElName.classList.item(0));
    }
}

var socketJson = io('http://' + location.host + '/json');
socketJson.emit('json', {'T':1,'L':0,'R':0})

var socket = io('http://' + location.host + '/ctrl');
socket.emit('request_data');

var light_mode = 0;
var cv_heartbeat_stop_flag = false;
socket.on('update', function(data) {
    // Only skip if data is completely empty or invalid
    if (!data || Object.keys(data).length === 0) {
        return;
    }
    try {
        var baseBtn = document.getElementById("base_led_ctrl_btn");
        if (baseBtn) {
            var BButtons = baseBtn.getElementsByTagName("button");
            removeButtonsClass(BButtons);
            if (data[base_light] == 0) {
                BButtons[0].classList.add("ctl_btn_active");
            } else if (data[base_light] != 0){
                BButtons[1].classList.add("ctl_btn_active");
            }
        }

        var advCBtn = document.getElementById("adv_cv_ctrl_btn");
        if (advCBtn) {
            var CButtons = advCBtn.getElementsByTagName("button");
            removeButtonsClass(CButtons);
        }

        var advFBtn = document.getElementById("adv_cv_funcs_btn");
        if (advFBtn) {
            var FButtons = advFBtn.getElementsByTagName("button");
            removeButtonsClass(FButtons);
        }

        var mpBtn = document.getElementById("mp_funcs_btn");
        if (mpBtn) {
            var MPButtons = mpBtn.getElementsByTagName("button");
            removeButtonsClass(MPButtons);
        }

        var dtIco = document.getElementById("DT");
        var dTypeBtn = document.getElementById("d_type_btn");
        if (dtIco) {
            removeAllIcoClass(dtIco);
        }
        if (dTypeBtn) {
            var DTbuttons = dTypeBtn.getElementsByTagName("button");
            removeButtonsClass(DTbuttons);
            
            if (data[detect_type] == cv_none) {
                if (dtIco) dtIco.classList.add("feed_ico", "feed_ico_none");
                DTbuttons[0].classList.add("ctl_btn_active");
            } else if (data[detect_type] == cv_moti) {
                if (dtIco) dtIco.classList.add("feed_ico", "feed_ico_movtion");
                DTbuttons[1].classList.add("ctl_btn_active");
            } else if (data[detect_type] == cv_face) {
                if (dtIco) dtIco.classList.add("feed_ico", "feed_ico_face");
                DTbuttons[2].classList.add("ctl_btn_active");
            } else if (data[detect_type] == cv_auto) {
                if (advCBtn) {
                    var CButtons = advCBtn.getElementsByTagName("button");
                    CButtons[2].classList.add("ctl_btn_active");
                }
            } else if (data[detect_type] == cv_objs) {
                if (advFBtn) {
                    var FButtons = advFBtn.getElementsByTagName("button");
                    FButtons[0].classList.add("ctl_btn_active");
                }
            } else if (data[detect_type] == cv_clor) {
                if (advFBtn) {
                    var FButtons = advFBtn.getElementsByTagName("button");
                    FButtons[1].classList.add("ctl_btn_active");
                }
            } else if (data[detect_type] == mp_hand) {
                if (advFBtn) {
                    var FButtons = advFBtn.getElementsByTagName("button");
                    FButtons[2].classList.add("ctl_btn_active");
                }
            } else if (data[detect_type] == mp_face) {
                if (mpBtn) {
                    var MPButtons = mpBtn.getElementsByTagName("button");
                    MPButtons[0].classList.add("ctl_btn_active");
                }
            } else if (data[detect_type] == mp_pose) {
                if (mpBtn) {
                    var MPButtons = mpBtn.getElementsByTagName("button");
                    MPButtons[1].classList.add("ctl_btn_active");
                }
            } else if (data[detect_type] == cv_none) {
                if (mpBtn) {
                    var MPButtons = mpBtn.getElementsByTagName("button");
                    MPButtons[2].classList.add("ctl_btn_active");
                }
            }
        }

        if (data[detect_type] == cv_auto && cv_heartbeat_stop_flag == false) {
            cv_heartbeat_stop_flag = true;
        } else if (cv_heartbeat_stop_flag == true) {
            cv_heartbeat_stop_flag = false;
        }

        if (advCBtn) {
            var CButtons = advCBtn.getElementsByTagName("button");
            if (data[cv_movtion_mode] == true) {
                CButtons[0].classList.add("ctl_btn_active");
            } else if (data[cv_movtion_mode] == false) {
                CButtons[1].classList.add("ctl_btn_active");
            }
        }

        var drIco = document.getElementById("DR");
        var DReactionBtn = document.getElementById("d_reaction_btn");
        if (DReactionBtn) {
            var DRbuttons = DReactionBtn.getElementsByTagName("button");
            removeButtonsClass(DRbuttons);
            
            if (data[detect_react] == re_none) {
                if (drIco) {
                    removeAllIcoClass(drIco);
                    drIco.classList.add("feed_ico", "feed_ico_none");
                }
                DRbuttons[0].classList.add("ctl_btn_active");
            } else if (data[detect_react] == re_capt) {
                if (drIco) {
                    removeAllIcoClass(drIco);
                    drIco.classList.add("feed_ico", "feed_ico_capture");
                }
                DRbuttons[1].classList.add("ctl_btn_active");
            } else if (data[detect_react] == re_reco) {
                if (drIco) {
                    removeAllIcoClass(drIco);
                    drIco.classList.add("feed_ico", "feed_ico_record");
                }
                DRbuttons[2].classList.add("ctl_btn_active");
            }
        }

        // Check if feedback codes are defined, if not use fallback values
        var cpuLoadKey = (typeof cpu_load !== 'undefined') ? cpu_load : 106;
        var cpuTempKey = (typeof cpu_temp !== 'undefined') ? cpu_temp : 107;
        var ramUsageKey = (typeof ram_usage !== 'undefined') ? ram_usage : 108;
        var wifiRssiKey = (typeof wifi_rssi !== 'undefined') ? wifi_rssi : 111;
        var videoFpsKey = (typeof video_fps !== 'undefined') ? video_fps : 113;
        
        
        // Update the display elements
        if (data[cpuLoadKey] !== undefined) {
            document.getElementById("CPU").innerHTML = Math.round(data[cpuLoadKey]) + "%";
        }
        if (data[cpuTempKey] !== undefined) {
            document.getElementById("tem").innerHTML = Math.round(data[cpuTempKey]) + " ℃";
        }
        if (data[ramUsageKey] !== undefined) {
            document.getElementById("RAM").innerHTML = Math.round(data[ramUsageKey]) + "%";
        }
        if (data[wifiRssiKey] !== undefined) {
            document.getElementById("rssi").innerHTML = Math.round(data[wifiRssiKey]) + " dBm";
        }
        if (data[videoFpsKey] !== undefined) {
            document.getElementById("fps").innerHTML = Math.round(data[videoFpsKey]);
        }
        
        // Handle other elements with fallback keys
        var pictureSizeKey = (typeof picture_size !== 'undefined') ? picture_size : 104;
        var videoSizeKey = (typeof video_size !== 'undefined') ? video_size : 105;
        var baseVoltageKey = (typeof base_voltage !== 'undefined') ? base_voltage : 112;
        
        if (data[pictureSizeKey] !== undefined) {
            document.getElementById("photos-size").innerHTML = Math.round(data[pictureSizeKey]) + " MB";
        }
        if (data[videoSizeKey] !== undefined) {
            document.getElementById("videos-size").innerHTML = Math.round(data[videoSizeKey]) + " MB";
        }
        if (data[baseVoltageKey] !== undefined) {
            document.getElementById("v_in").innerHTML = Math.round(data[baseVoltageKey]);
            
            // Calculate and display battery percentage
            var voltage = data[baseVoltageKey];
            var batteryPercent = 0;
            
            // Battery percentage calculation for 2S 18650 Li-ion batteries
            // 2S = 2 cells in series: 6.0V (0%) to 8.4V (100%)
            if (voltage >= 8.4) {
                batteryPercent = 100;
            } else if (voltage >= 6.0) {
                batteryPercent = Math.round(((voltage - 6.0) / (8.4 - 6.0)) * 100);
            } else {
                batteryPercent = 0;
            }
            
            // Ensure percentage is between 0 and 100
            batteryPercent = Math.max(0, Math.min(100, batteryPercent));
            document.getElementById("battery_percent").innerHTML = batteryPercent;
        }
        
        // Update battery state
        var element = document.getElementById("b_state");
        element.classList.remove("baterry_state", "baterry_state1", "baterry_state2", "baterry_state3");
        if (data[baseVoltageKey] !== undefined) {
            var voltage = data[baseVoltageKey];
            if (voltage >= 8) {
                element.classList.add("baterry_state");
            } else if (voltage >= 7) {
                element.classList.add("baterry_state","baterry_state3");
            } else if (voltage >= 6.5) {
                element.classList.add("baterry_state","baterry_state2");
            } else if (voltage < 6.5) {
                element.classList.add("baterry_state","baterry_state1");
            }
        }
    } catch(e) {
        console.log(e);
    }

});

var heartbeat_left  = 0;
var heartbeat_right = 0;
var speed_rate = 0.3;
var defaultSpeed = speed_rate;
let lastTimeCmdSend = Date.now();;
let lastArgsCmdSend;
function cmdSend(inputA, inputB, inputC){
    const now = Date.now();
    if (!lastArgsCmdSend || inputA != lastArgsCmdSend || now - lastTimeCmdSend >= 10) {
        var jsonData = {
            "A":inputA,
            "B":inputB,
            "C":inputC
        };
        socket.send(JSON.stringify(jsonData));
        lastArgsCmdSend = inputA;
        lastTimeCmdSend = now;
    }
}

function cmdJsonCmd(jsonData){
    if (jsonData.T == cmd_movition_ctrl) {
        heartbeat_left = jsonData.L;
        heartbeat_right = jsonData.R;
        jsonData.L = heartbeat_left * speed_rate;
        jsonData.R = heartbeat_right * speed_rate;
    }
    socketJson.emit('json', jsonData);
}

function speedCtrl(inputSpd){
    speed_rate = inputSpd;
    defaultSpeed = speed_rate;
    var spdCtrlBtn = document.getElementById("speed_ctrl_btn");
    var spdbuttons = spdCtrlBtn.getElementsByTagName("button");
    removeButtonsClass(spdbuttons);
    if (speed_rate <= 0.30) {
        spdbuttons[0].classList.add("ctl_btn_active");
    } else if (speed_rate > 0.30 && speed_rate < 0.70) {
        spdbuttons[1].classList.add("ctl_btn_active");
    } else if (speed_rate >= 0.70) {
        spdbuttons[2].classList.add("ctl_btn_active");
    }
}

function funcsCtrl(index){
    // Send function control command directly without HTML button interaction
    cmdJsonCmd({"T":112,"func":index});
}

var steady_mode = false;
function steadyCtrl(inputCmd, inputBias){
    inputBias = -inputBias*0.4;
    var steadyCtrlBtn = document.getElementById("steady_ctrl_btn");
    var steadybuttons = steadyCtrlBtn.getElementsByTagName("button");
    removeButtonsClass(steadybuttons);
    if (inputCmd == 0) {
        steadybuttons[0].classList.add("ctl_btn_active");
        steady_mode = false;
        cmdJsonCmd({"T":cmd_gimbal_steady,"s":0,"y":inputBias});
    } else if (inputCmd == 1) {
        steadybuttons[1].classList.add("ctl_btn_active");
        steady_mode = true;
        cmdJsonCmd({"T":cmd_gimbal_steady,"s":1,"y":inputBias});
    }
}

function rgbCtrl(index){
    var lightCtrlBtn = document.getElementById("light_ctrl_btn");
    var lbuttons = lightCtrlBtn.getElementsByTagName("button");
    removeButtonsClass(lbuttons);
    if (index == 0) {
        lbuttons[0].classList.add("ctl_btn_active");
        cmdJsonCmd({"T":201,"set":[0,255,0,64]});
        cmdJsonCmd({"T":201,"set":[1,64,0,255]});
    } else if (index == 1) {
        lbuttons[1].classList.add("ctl_btn_active");
        cmdJsonCmd({"T":201,"set":[0,255,0,0]});
        cmdJsonCmd({"T":201,"set":[1,255,0,0]});
    } else if (index == 2) {
        lbuttons[2].classList.add("ctl_btn_active");
        cmdJsonCmd({"T":201,"set":[0,0,0,255]});
        cmdJsonCmd({"T":201,"set":[1,0,0,255]});
    }
}

var heartbeat_send_flag = true;
function heartbeat_send(){
    if (socketJson.connected && heartbeat_send_flag && !cv_heartbeat_stop_flag) {
        cmdJsonCmd({'T':cmd_movition_ctrl,'L':heartbeat_left,'R':heartbeat_right});
    }
}
setInterval(heartbeat_send, 2000);

// Head movement continuous control
var head_movement_active = false;
var head_pan_speed = 0;
var head_tilt_speed = 0;

// Key state tracking for continuous detection
var keyStates = {};

function head_movement_send(){
    if (socketJson.connected && head_movement_active) {
        // Update head position based on current speed
        if (typeof window.headPanPosition === 'undefined') {
            window.headPanPosition = 0;
            window.headTiltPosition = 0;
        }
        
        window.headPanPosition += head_pan_speed;
        window.headTiltPosition += head_tilt_speed;
        
        // Clamp head position to reasonable limits
        window.headPanPosition = Math.max(-180, Math.min(180, window.headPanPosition));
        window.headTiltPosition = Math.max(-30, Math.min(30, window.headTiltPosition));
        
        // Send head position command
        cmdJsonCmd({"T":cmd_gimbal_ctrl,"X":window.headPanPosition,"Y":window.headTiltPosition,"SPD":0,"ACC":32});
        
        // Update UI display
        RotateAngle = document.getElementById("Pan").innerHTML = window.headPanPosition.toFixed(2);
        var panScale = document.getElementById("pan_scale");
        panScale.style.transform = `rotate(${-RotateAngle}deg)`;

        var tiltNum = document.getElementById("Tilt");
        var tiltNumPanel = tiltNum.getBoundingClientRect();
        var tiltNumMove = tiltNum.innerHTML = window.headTiltPosition.toFixed(2);

        var pointer = document.getElementById('tilt_scale_pointer');
        var tiltScaleOut = document.getElementById('tilt_scale');
        var tiltScaleBase = tiltScaleOut.getBoundingClientRect();
        var tiltScalediv = document.getElementById('tilt_scalediv');
        var tiltScaleDivBase = tiltScalediv.getBoundingClientRect();
        var pointerMoveY = tiltScaleBase.height/135;
        pointer.style.transform = `translate(${tiltScaleDivBase.width}px, ${pointerMoveY*(90 - tiltNumMove)-tiltNumPanel.height/2}px)`;
    }
}
setInterval(head_movement_send, 50); // Update every 50ms for smooth movement

// Continuous movement processing
setInterval(moveProcess, 50); // Update every 50ms for smooth movement

var isInputFocused = false;

var moveKeyMap = {
    16: 'shift', // acce
    65: 'left',   // A
    87: 'forward', // W
    83: 'backward', // S
    68: 'right', // D
    37: 'head_left', // Left Arrow
    38: 'head_up', // Up Arrow
    39: 'head_right', // Right Arrow
    40: 'head_down', // Down Arrow
}
var move_buttons = {
    shift: 0,
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    head_left: 0,
    head_up: 0,
    head_right: 0,
    head_down: 0,
}
function resetGimbalToCenter() {
    // Reset head position to center
    window.headPanPosition = 0;
    window.headTiltPosition = 0;
    
    // Send gimbal center command
    cmdJsonCmd({"T":cmd_gimbal_ctrl,"X":0,"Y":0,"SPD":0,"ACC":32});
    
    // Update UI display
    RotateAngle = document.getElementById("Pan").innerHTML = "0.00";
    var panScale = document.getElementById("pan_scale");
    panScale.style.transform = `rotate(0deg)`;

    var tiltNum = document.getElementById("Tilt");
    var tiltNumPanel = tiltNum.getBoundingClientRect();
    var tiltNumMove = tiltNum.innerHTML = "0.00";

    var pointer = document.getElementById('tilt_scale_pointer');
    var tiltScaleOut = document.getElementById('tilt_scale');
    var tiltScaleBase = tiltScaleOut.getBoundingClientRect();
    var tiltScalediv = document.getElementById('tilt_scalediv');
    var tiltScaleDivBase = tiltScalediv.getBoundingClientRect();
    var pointerMoveY = tiltScaleBase.height/135;
    pointer.style.transform = `translate(${tiltScaleDivBase.width}px, ${pointerMoveY*(90 - 0)-tiltNumPanel.height/2}px)`;
}

function moveProcess() {
    var forwardButton  = ctrl_buttons.forward;
    var backwardButton = ctrl_buttons.backward;
    var leftButton  = ctrl_buttons.left;
    var rightButton = ctrl_buttons.right;


    // if(move_buttons.shift == 1) {
    //     speed_rate = max_rate;
    //     var spdCtrlBtn = document.getElementById("speed_ctrl_btn");
    //     var spdbuttons = spdCtrlBtn.getElementsByTagName("button");
    //     removeButtonsClass(spdbuttons);
    //     if (speed_rate <= 0.33) {
    //         spdbuttons[0].classList.add("ctl_btn_active");
    //     } else if (speed_rate > 0.33 && speed_rate < 0.66) {
    //         spdbuttons[1].classList.add("ctl_btn_active");
    //     } else if (speed_rate >= 0.66) {
    //         spdbuttons[2].classList.add("ctl_btn_active");
    //     }
    // } else {
    //     speedCtrl(defaultSpeed);
    // }

    // Movtion Ctrl
    if (forwardButton == 0 && backwardButton == 0 && leftButton == 0 && rightButton == 0) {
        heartbeat_left  =  0;
        heartbeat_right =  0;
    }else if (forwardButton == 1 && backwardButton == 0 && leftButton == 0 && rightButton == 0){
        heartbeat_left  =  max_speed;
        heartbeat_right =  max_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 0 && backwardButton == 1 && leftButton == 0 && rightButton == 0){
        heartbeat_left  = -max_speed;
        heartbeat_right = -max_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 0 && backwardButton == 0 && leftButton == 1 && rightButton == 0){
        heartbeat_left  = -max_speed;
        heartbeat_right =  max_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 0 && backwardButton == 0 && leftButton == 0 && rightButton == 1){
        heartbeat_left  =  max_speed;
        heartbeat_right = -max_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 1 && backwardButton == 0 && leftButton == 1 && rightButton == 0){
        heartbeat_left  =  slow_speed;
        heartbeat_right =  max_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 1 && backwardButton == 0 && leftButton == 0 && rightButton == 1){
        heartbeat_left  =  max_speed;
        heartbeat_right =  slow_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 0 && backwardButton == 1 && leftButton == 1 && rightButton == 0){
        heartbeat_left  = -slow_speed;
        heartbeat_right = -max_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }else if (forwardButton == 0 && backwardButton == 1 && leftButton == 0 && rightButton == 1){
        heartbeat_left  = -max_speed;
        heartbeat_right = -slow_speed;
        // Reset gimbal to center when moving
        resetGimbalToCenter();
    }

    // Head movement control with arrow keys (continuous movement)
    // Check key states directly for continuous detection
    var headLeftPressed = keyStates[37] || false;  // Left arrow
    var headUpPressed = keyStates[38] || false;    // Up arrow
    var headRightPressed = keyStates[39] || false; // Right arrow
    var headDownPressed = keyStates[40] || false;  // Down arrow
    
    // Initialize head position tracking if not exists
    if (typeof window.headPanPosition === 'undefined') {
        window.headPanPosition = 0;
        window.headTiltPosition = 0;
    }
    
    // Different speeds for horizontal and vertical movement
    var headPanSpeed = 15.0; // Horizontal speed (pan) - 5x faster
    var headTiltSpeed = 3.0; // Vertical speed (tilt) - original speed
    
    // Set head movement speeds based on pressed keys
    head_pan_speed = 0;
    head_tilt_speed = 0;
    
    if (headLeftPressed) {
        head_pan_speed = -headPanSpeed; // Pan left
    } else if (headRightPressed) {
        head_pan_speed = headPanSpeed; // Pan right
    }
    
    if (headUpPressed) {
        head_tilt_speed = headTiltSpeed; // Tilt up
    } else if (headDownPressed) {
        head_tilt_speed = -headTiltSpeed; // Tilt down
    }
    
    // Activate/deactivate head movement
    head_movement_active = (headLeftPressed || headRightPressed || headUpPressed || headDownPressed);

    cmdJsonCmd({'T':cmd_movition_ctrl,'L':heartbeat_left,'R':heartbeat_right});
}
function updateMoveButton(key, value) {
    move_buttons[key] = value;
}

var keyMap = {
    32: 'jump', // Spacebar - Jump
    65: 'left', // A - Move Left
    67: 'write_command', // C - Write Command
    68: 'right', // D - Move Right
    69: 'capture', // E - Camera Capture
    72: 'handshake', // H - Handshake
    80: 'photo_gallery', // P - Photo Gallery
    82: 'record_toggle', // R - Record Toggle
    83: 'backward', // S - Move Backward
    84: 'stay', // T - Stay
    86: 'video_gallery', // V - Video Gallery
    87: 'forward', // W - Move Forward
    90: 'zoom' // Z - Camera Zoom
};

var ctrl_buttons = {
    // Movement controls
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    // Function controls
    jump: 0,
    handshake: 0,
    stay: 0,
    // Camera controls
    capture: 0,
    record_toggle: 0,
    zoom: 0,
    // Gallery controls
    photo_gallery: 0,
    video_gallery: 0,
    // Command control
    write_command: 0
};

function updateButton(key, value) {
    ctrl_buttons[key] = value;
}

function cmdProcess() {
    // Function Controls
    if (ctrl_buttons.jump == 1){
        funcsCtrl(3); // Jump
    }
    if (ctrl_buttons.handshake == 1){
        funcsCtrl(2); // Handshake
    }
    if (ctrl_buttons.stay == 1){
        funcsCtrl(1); // Stay
    }
    
    // Write Command
    if (ctrl_buttons.write_command == 1){
        toggleCommandInput();
    }
    
    // Camera Capture
    if (ctrl_buttons.capture == 1){
        cmdSend(pic_cap, 0, 0);
        showCaptureIndicator();
    }
    
    // Record Toggle
    if (ctrl_buttons.record_toggle == 1){
        toggleRecord();
    }
    
    // Camera Zoom
    if (ctrl_buttons.zoom == 1){
        toggleZoom();
    }
    
    // Gallery Navigation
    if (ctrl_buttons.photo_gallery == 1){
        window.location.href = './photo.html';
    }
    
    if (ctrl_buttons.video_gallery == 1){
        window.location.href = './video.html';
    }
}

// Command input functionality
function toggleCommandInput() {
    var container = document.getElementById('command_input_container');
    var input = document.getElementById('command_input');
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        // Don't set isInputFocused here - let the focus event handle it
        setTimeout(function() {
            input.focus();
        }, 10);
    } else {
        container.style.display = 'none';
        input.value = '';
        isInputFocused = false; // Re-enable keyboard controls
    }
}

function closeCommandInput() {
    var container = document.getElementById('command_input_container');
    var input = document.getElementById('command_input');
    
    container.style.display = 'none';
    input.value = '';
    isInputFocused = false; // Re-enable keyboard controls
}

// Command processing function
function processCommand(command) {
    command = command.toUpperCase().trim();
    
    switch(command) {
        case 'LOCK':
            cmdSend(mc_lock, 0, 0);
            setStatusDot('status_lock', true);
            resetCVCtrlStatus('status_lock');
            break;
        case 'UNL':
            cmdSend(mc_unlo, 0, 0);
            setStatusDot('status_unlock', true);
            resetCVCtrlStatus('status_unlock');
            break;
        case 'OBJ':
            cmdSend(cv_objs, 0, 0);
            setStatusDot('status_obj', true);
            resetCVFuncsStatus('status_obj');
            break;
        case 'COL':
            cmdSend(cv_clor, 0, 0);
            setStatusDot('status_col', true);
            resetCVFuncsStatus('status_col');
            break;
        case 'HAND':
            cmdSend(mp_hand, 0, 0);
            setStatusDot('status_hand', true);
            resetCVFuncsStatus('status_hand');
            break;
        case 'FACE':
            cmdSend(mp_face, 0, 0);
            setStatusDot('status_face', true);
            resetCVFuncsStatus('status_face');
            break;
        case 'POSE':
            cmdSend(mp_pose, 0, 0);
            setStatusDot('status_pose', true);
            resetCVFuncsStatus('status_pose');
            break;
        case 'COFF':
            cmdSend(cv_none, 0, 0);
            setStatusDot('status_coff', true);
            resetCVFuncsStatus('status_coff');
            break;
        case 'STON':
            funcsCtrl(4);
            setStatusDot('status_steadyon', true);
            resetPTSteadyAheadStatus('status_steadyon');
            break;
        case 'STOFF':
            funcsCtrl(5);
            setStatusDot('status_steadyoff', true);
            resetPTSteadyAheadStatus('status_steadyoff');
            break;
        case 'AHD':
            lookAhead();
            setStatusDot('status_ahead', true);
            resetPTSteadyAheadStatus('status_ahead');
            break;
        case 'DNON':
            cmdSend(cv_none, 0, 0);
            setStatusDot('status_detnon', true);
            resetDetectionTypeStatus('status_detnon');
            break;
        case 'RNON':
            cmdSend(re_none, 0, 0);
            setStatusDot('status_reactnone', true);
            resetDetectionReactionStatus('status_reactnone');
            break;
        case 'RCAP':
            cmdSend(re_capt, 0, 0);
            setStatusDot('status_reactcap', true);
            resetDetectionReactionStatus('status_reactcap');
            break;
        case 'RREC':
            cmdSend(re_reco, 0, 0);
            setStatusDot('status_reactrec', true);
            resetDetectionReactionStatus('status_reactrec');
            break;
        case 'DMOT':
            cmdSend(cv_moti, 1, 0);
            setStatusDot('status_detmotion', true);
            resetDetectionTypeStatus('status_detmotion');
            break;
        case 'DFACE':
            cmdSend(cv_face, 2, 0);
            setStatusDot('status_detfaces', true);
            resetDetectionTypeStatus('status_detfaces');
            break;
        default:
            console.log('Unknown command: ' + command);
            showInvalidCommandMessage();
            break;
    }
}

// Helper function to hide all indicators
function hideAllIndicators() {
    var captureIndicator = document.getElementById('capture_indicator');
    var recordingIndicator = document.getElementById('recording_indicator');
    
    if (captureIndicator) {
        captureIndicator.style.display = 'none';
        captureIndicator.classList.remove('pulse');
    }
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
        recordingIndicator.classList.remove('pulse');
    }
}

// Show invalid command message
function showInvalidCommandMessage() {
    hideAllIndicators(); // Hide any existing indicators
    
    var indicator = document.getElementById('capture_indicator');
    if (indicator) {
        var textElement = indicator.querySelector('.indicator_text');
        var iconElement = indicator.querySelector('.indicator_icon');
        
        if (textElement) {
            textElement.textContent = "THAT'S NOT A COMMAND";
        }
        
        // Hide the camera icon for invalid command message
        if (iconElement) {
            iconElement.style.display = 'none';
        }
        
        indicator.style.display = 'block';
        
        // Hide the message after 1 second
        setTimeout(function() {
            indicator.style.display = 'none';
            // Restore the icon for future use
            if (iconElement) {
                iconElement.style.display = 'block';
            }
        }, 1000);
    }
}

// Status dot control functions
function setStatusDot(elementId, active) {
    var dot = document.getElementById(elementId);
    if (dot) {
        if (active) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    }
}

function resetAllStatusDots() {
    var statusDots = [
        'status_lock', 'status_unlock',
        'status_obj', 'status_col', 'status_hand', 'status_face', 'status_pose', 'status_coff',
        'status_steadyon', 'status_steadyoff', 'status_ahead',
        'status_detnon', 'status_detcap', 'status_detrec'
    ];
    
    statusDots.forEach(function(dotId) {
        setStatusDot(dotId, false);
    });
}

// Reset CV Funcs status (only one can be active at a time)
function resetCVFuncsStatus(exceptId) {
    var cvFuncsDots = ['status_obj', 'status_col', 'status_hand', 'status_face', 'status_pose', 'status_coff'];
    cvFuncsDots.forEach(function(dotId) {
        if (dotId !== exceptId) {
            setStatusDot(dotId, false);
        }
    });
}

// Reset Detection Type status (only one can be active at a time)
function resetDetectionTypeStatus(exceptId) {
    var detectionTypeDots = ['status_detnon', 'status_detmotion', 'status_detfaces'];
    detectionTypeDots.forEach(function(dotId) {
        if (dotId !== exceptId) {
            setStatusDot(dotId, false);
        }
    });
}

// Reset Detection Reaction status (only one can be active at a time)
function resetDetectionReactionStatus(exceptId) {
    var detectionDots = ['status_reactnone', 'status_reactcap', 'status_reactrec'];
    detectionDots.forEach(function(dotId) {
        if (dotId !== exceptId) {
            setStatusDot(dotId, false);
        }
    });
}

// Reset CV Ctrl status (only one can be active at a time)
function resetCVCtrlStatus(exceptId) {
    var cvCtrlDots = ['status_lock', 'status_unlock'];
    cvCtrlDots.forEach(function(dotId) {
        if (dotId !== exceptId) {
            setStatusDot(dotId, false);
        }
    });
}

// Reset CV Funcs status (only one can be active at a time)
function resetCVFuncsStatus(exceptId) {
    var cvFuncsDots = ['status_obj', 'status_col', 'status_hand', 'status_face', 'status_pose', 'status_coff'];
    cvFuncsDots.forEach(function(dotId) {
        if (dotId !== exceptId) {
            setStatusDot(dotId, false);
        }
    });
}

// Reset PT Steady/Ahead status (only one can be active at a time)
function resetPTSteadyAheadStatus(exceptId) {
    var ptDots = ['status_steadyon', 'status_steadyoff', 'status_ahead'];
    ptDots.forEach(function(dotId) {
        if (dotId !== exceptId) {
            setStatusDot(dotId, false);
        }
    });
}

// Set default status when app starts
function setDefaultStatus() {
    // Reset all status indicators to false (inactive state)
    var allStatusDots = [
        'status_lock', 'status_unlock',
        'status_obj', 'status_col', 'status_hand', 'status_face', 'status_pose', 'status_coff',
        'status_steadyon', 'status_steadyoff', 'status_ahead',
        'status_detnon', 'status_detmotion', 'status_detfaces',
        'status_reactnone', 'status_reactcap', 'status_reactrec'
    ];
    
    allStatusDots.forEach(function(dotId) {
        setStatusDot(dotId, false);
    });
    
    // Set default active commands (green) by default - these are the "off/none" commands
    setStatusDot('status_lock', true);     // CV Ctrl - Lock
    setStatusDot('status_coff', true);     // CV Funcs - CV Funcs Off
    setStatusDot('status_steadyoff', true); // PT Steady/Ahead - Steady Off
    setStatusDot('status_detnon', true);   // Detection - Detection None
    setStatusDot('status_reactnone', true); // Reaction - React None
}

// Record toggle function
var isRecording = false;
function toggleRecord() {
    if (isRecording) {
        // Stop recording
        cmdSend(vid_end, 0, 0);
        isRecording = false;
        hideRecordingIndicator();
    } else {
        // Start recording
        cmdSend(vid_sta, 0, 0);
        isRecording = true;
        showRecordingIndicator();
    }
}

// Indicator functions
function showCaptureIndicator() {
    hideAllIndicators(); // Hide any existing indicators
    
    var indicator = document.getElementById('capture_indicator');
    if (indicator) {
        var textElement = indicator.querySelector('.indicator_text');
        var iconElement = indicator.querySelector('.indicator_icon');
        
        // Update the text to show it was saved to gallery
        if (textElement) {
            textElement.textContent = 'CAPTURE SAVED TO PHOTO GALLERY';
        }
        
        // Show the camera icon for capture message
        if (iconElement) {
            iconElement.style.display = 'block';
        }
        
        indicator.style.display = 'block';
        // Hide after 3 seconds
        setTimeout(function() {
            indicator.style.display = 'none';
        }, 3000);
    }
}

function showRecordingIndicator() {
    hideAllIndicators(); // Hide any existing indicators
    
    var indicator = document.getElementById('recording_indicator');
    if (indicator) {
        // Update the text to show recording is underway
        var textElement = indicator.querySelector('.indicator_text');
        if (textElement) {
            textElement.textContent = 'RECORDING UNDERWAY';
        }
        indicator.style.display = 'block';
        indicator.classList.add('pulse');
    }
}

function hideRecordingIndicator() {
    var indicator = document.getElementById('recording_indicator');
    if (indicator) {
        indicator.style.display = 'none';
        indicator.classList.remove('pulse');
        // Show saved message
        showRecordingSavedMessage();
    }
}

function showRecordingSavedMessage() {
    hideAllIndicators(); // Hide any existing indicators
    
    var indicator = document.getElementById('capture_indicator');
    if (indicator) {
        var textElement = indicator.querySelector('.indicator_text');
        var iconElement = indicator.querySelector('.indicator_icon');
        
        // Update the text to show recording was saved
        if (textElement) {
            textElement.textContent = 'RECORDING SAVED TO VIDEO GALLERY';
        }
        
        // Hide the camera icon for recording saved message
        if (iconElement) {
            iconElement.style.display = 'none';
        }
        
        indicator.style.display = 'block';
        // Hide after 3 seconds
        setTimeout(function() {
            indicator.style.display = 'none';
            // Restore the icon for future use
            if (iconElement) {
                iconElement.style.display = 'block';
            }
        }, 3000);
    }
}

// Zoom toggle function
function toggleZoom() {
    // Toggle zoom through levels: 1x -> 2x -> 4x -> 1x
    var zoomNum = document.getElementById("zoom-num");
    switch(zoomx){
        case 0: 
            cmdSend(zoom_x1, 0, 0);
            if (zoomNum) zoomNum.innerHTML = "1x";
            break;
        case 1: 
            cmdSend(zoom_x2, 0, 0);
            if (zoomNum) zoomNum.innerHTML = "2x";
            break;
        case 2: 
            cmdSend(zoom_x4, 0, 0);
            if (zoomNum) zoomNum.innerHTML = "4x";
            break;
    }
    zoomx = (zoomx + 1) % 3;
}

document.onkeydown = function (event) {
    // ESC key handling for gallery navigation
    if (event.keyCode === 27) {
        event.preventDefault();
        if (isInputFocused) {
            // Only allow ESC to close command input when focused
            closeCommandInput();
        } else {
            // Navigate back to index from gallery pages
            if (window.location.pathname.includes('photo.html') || window.location.pathname.includes('video.html')) {
                window.location.href = './index.html';
            }
        }
        return;
    }
    
    if (isInputFocused) {
        return;
    }
    
    // Prevent default behavior for arrow keys and spacebar to stop page scrolling
    if (event.keyCode >= 37 && event.keyCode <= 40 || event.keyCode === 32) {
        event.preventDefault();
    }
    
    // Track key state for continuous detection
    keyStates[event.keyCode] = true;
    
    var key = keyMap[event.keyCode];
    var moveKey = moveKeyMap[event.keyCode];
    if (key && ctrl_buttons[key] === 0) {
        updateButton(key, 1);
        cmdProcess();
        // Reset the button state immediately for write_command to prevent key consumption
        if (key === 'write_command') {
            updateButton(key, 0);
        }
    } else if (moveKey && move_buttons[moveKey] === 0) {
        updateMoveButton(moveKey, 1);
        moveProcess();
    }
}

document.onkeyup = function (event) {
    if (isInputFocused) {
        return;
    }
    
    // Prevent default behavior for arrow keys and spacebar to stop page scrolling
    if (event.keyCode >= 37 && event.keyCode <= 40 || event.keyCode === 32) {
        event.preventDefault();
    }
    
    // Track key state for continuous detection
    keyStates[event.keyCode] = false;
    
    var key = keyMap[event.keyCode];
    var moveKey = moveKeyMap[event.keyCode];
    if (key && ctrl_buttons[key] === 1) {
        updateButton(key, 0);
        cmdProcess();
    } else if (moveKey && move_buttons[moveKey] === 1) {
        updateMoveButton(moveKey, 0);
        moveProcess();
    }
}

// Command input event listener
document.addEventListener('DOMContentLoaded', function() {
    // Set default status when page loads
    setDefaultStatus();
    
    var commandInput = document.getElementById('command_input');
    if (commandInput) {
        // Focus event - disable keyboard controls
        commandInput.addEventListener('focus', function() {
            isInputFocused = true;
        });
        
        // Blur event - re-enable keyboard controls
        commandInput.addEventListener('blur', function() {
            isInputFocused = false;
        });
        
        commandInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                var command = this.value;
                if (command.trim() !== '') {
                    processCommand(command);
                    this.value = '';
                    document.getElementById('command_input_container').style.display = 'none';
                    isInputFocused = false; // Re-enable keyboard controls
                }
            }
        });
        
        commandInput.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeCommandInput();
            }
        });
        
        // Convert input to uppercase as user types
        commandInput.addEventListener('input', function(event) {
            this.value = this.value.toUpperCase();
        });
    }
});

function lookAhead() {
    if (module_type == 1) {
        armZ = arm_default_z; 
        armR = arm_default_r;
        armE = arm_default_e;
        stickLastX = 0;
        stickLastY = -arm_default_z;
        stickSendX = 0;
        stickSendY = -arm_default_z;
        cmdJsonCmd({"T":cmd_arm_ctrl_ui,"E":armE,"Z":armZ,"R":armR});
    } else {
        armZ = arm_default_z; 
        armR = arm_default_r;
        armE = arm_default_e;
        stickLastX = 0;
        stickLastY = 0;
        stickSendX = 0;
        stickSendY = 0;
        joyStickCtrl(0, 0);
    }
}

document.getElementById('sendButton').addEventListener('click', function() {
    var command = document.getElementById('commandInput').value;
    fetch('/send_command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'command=' + encodeURIComponent(command)
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // 处理响应
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

document.getElementById('commandInput').addEventListener('focus', function() {
    isInputFocused = true;
});

document.getElementById('commandInput').addEventListener('blur', function() {
    isInputFocused = false;
});






// gamepad ctrl functions
var gp_x = 0.00;
var gp_z = 0.00;
var last_gp_x = 0.00;
var last_gp_z = 0.00;
var gp_turnning = 3.14;

var last_gp_lt1 = false;
var last_gp_lt2 = false;
var last_gp_rt1 = false;
var last_gp_rt2 = false;

var last_gp_record = false;
var last_gp_picture = false;

var gp_pt_x = 0;
var gp_pt_y = 0;
var last_gp_pt_x = 0;
var last_gp_pt_y = 0;
var gp_pt_speed = 1.0;

window.addEventListener("gamepadconnected", function(e) {
  console.log("gamepad connected:" + e.gamepad.index);
  heartbeat_send_flag = false;
});

window.addEventListener("gamepaddisconnected", function(e) {
  console.log("gamepad disconnected:" + e.gamepad.index);
  heartbeat_send_flag = true;
});

function logButtons(gamepad) {
  gamepad.buttons.forEach((button, index) => {
    console.log(`button ${index}: ${button.pressed ? 'pressed' : 'released'}`);
  });
}

function logAxes(gamepad) {
  gamepad.axes.forEach((axis, index) => {
    console.log(`axis ${index}: ${axis}`);

  });
}

function readGamepad() {
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (var i = 0; i < gamepads.length; i++) {
    var gp = gamepads[i];
    if(gp) {
      // logButtons(gp);
      // logAxes(gp);
      gp_x = - gp.axes[1] * max_speed;
      gp_z = - gp.axes[0] * gp_turnning;
      if(Math.abs(gp_x) < 0.02){
        gp_x = 0;
      }
      if(Math.abs(gp_z) < 0.02){
        gp_z = 0;
      }
      // console.log(`X: ${gp_x} Z: ${gp_z}`);
      if(gp_x != last_gp_x || gp_z != last_gp_z){
        cmdJsonCmd({"T":13,"X":gp_x,"Z":gp_z});
        last_gp_x = gp_x;
        last_gp_z = gp_z;
      }

      if(last_gp_record != gp.buttons[9].pressed){
        if (gp.buttons[9].pressed) {
            if (!isRecording) {
                cmdSend(vid_sta,0,0);
                $(document).css("color", "#FF8C8C");
                $(document).removeClass("video_btn_record");
                $(document).addClass("video_btn_stop");
                isRecording = true;
                $(document).text("00:00");
                timerInterval = setInterval(updateTimer, 1000);
            } else {
                cmdSend(vid_end,0,0);
                $(document).removeClass("video_btn_stop");
                $(document).addClass("video_btn_record");
                $(document).text(originalText);
                isRecording = false;
                clearInterval(timerInterval);
                seconds = 0;
                minutes = 0;
                $(document).css("color", "");
                updateVideoList();
            }
        }
        last_gp_record = gp.buttons[9].pressed;
      }

      if(last_gp_picture != gp.buttons[8].pressed){
        if (gp.buttons[8].pressed) {
            cmdSend(pic_cap,0,0);
        }
        last_gp_picture = gp.buttons[8].pressed;
      }

      if (module_type != 1) {
          if(last_gp_rt1 != gp.buttons[5].pressed){
            last_gp_rt1 = gp.buttons[5].pressed;
            gp_pt_x = 0;
            gp_pt_y = 0;
            cmdJsonCmd({"T":cmd_gimbal_ctrl,"X":gp_pt_x,"Y":gp_pt_y,"SPD":0,"ACC":0});
            last_gp_pt_x = gp_pt_x;
            last_gp_pt_y = gp_pt_y;

            RotateAngle = document.getElementById("Pan").innerHTML = gp_pt_x.toFixed(2);
            var panScale = document.getElementById("pan_scale");
            panScale.style.transform = `rotate(${-RotateAngle}deg)`;

            var tiltNum = document.getElementById("Tilt");
            var tiltNumPanel = tiltNum.getBoundingClientRect();
            var tiltNumMove = tiltNum.innerHTML = gp_pt_y.toFixed(2);;

            var pointer = document.getElementById('tilt_scale_pointer');
            var tiltScaleOut = document.getElementById('tilt_scale');
            var tiltScaleBase = tiltScaleOut.getBoundingClientRect();
            var tiltScalediv = document.getElementById('tilt_scalediv');
            var tiltScaleDivBase = tiltScalediv.getBoundingClientRect();
            var pointerMoveY = tiltScaleBase.height/135;
            pointer.style.transform = `translate(${tiltScaleDivBase.width}px, ${pointerMoveY*(90 - tiltNumMove)-tiltNumPanel.height/2}px)`;
          }

          if(last_gp_rt2 != gp.buttons[7].pressed){
            last_gp_rt2 = gp.buttons[7].pressed;
            cmdSend(head_ct, 0, 0);
          }


          if(gp.buttons[0].pressed){
            gp_pt_y -= gp_pt_speed;
            if(gp_pt_y < -30){
                gp_pt_y = -30;
            }
          }

          if(gp.buttons[2].pressed){
            gp_pt_x -= gp_pt_speed;
            if(gp_pt_x < -180){
                gp_pt_x = -180;
            }
          }

          if(gp.buttons[1].pressed){
            gp_pt_x += gp_pt_speed;
            if(gp_pt_x > 180){
                gp_pt_x = 180;
            }
          } 

          if(gp.buttons[3].pressed){
            gp_pt_y += gp_pt_speed;
            if(gp_pt_y > 90){
                gp_pt_y = 90;
            }
          }

          if(last_gp_pt_x != gp_pt_x || last_gp_pt_y != gp_pt_y){
            cmdJsonCmd({"T":cmd_gimbal_ctrl,"X":gp_pt_x,"Y":gp_pt_y,"SPD":0,"ACC":32});
          }

          var change_x = gp.axes[2];
          if(Math.abs(change_x) < 0.01){
            change_x = 0;
          }
          var change_y = gp.axes[3];
          if(Math.abs(change_y) < 0.01){
            change_y = 0;
          }
          gp_pt_x = gp_pt_x + change_x * gp_pt_speed;
          gp_pt_x = Math.max(-180, Math.min(gp_pt_x, 180));
          gp_pt_y = gp_pt_y - change_y * gp_pt_speed;
          gp_pt_y = Math.max(-30, Math.min(gp_pt_y, 90));

          if(gp_pt_x != last_gp_pt_x || gp_pt_y != last_gp_pt_y){
            cmdJsonCmd({"T":cmd_gimbal_ctrl,"X":gp_pt_x,"Y":gp_pt_y,"SPD":0,"ACC":32});
            last_gp_pt_x = gp_pt_x;
            last_gp_pt_y = gp_pt_y;

            RotateAngle = document.getElementById("Pan").innerHTML = gp_pt_x.toFixed(2);
            var panScale = document.getElementById("pan_scale");
            panScale.style.transform = `rotate(${-RotateAngle}deg)`;

            var tiltNum = document.getElementById("Tilt");
            var tiltNumPanel = tiltNum.getBoundingClientRect();
            var tiltNumMove = tiltNum.innerHTML = gp_pt_y.toFixed(2);;

            var pointer = document.getElementById('tilt_scale_pointer');
            var tiltScaleOut = document.getElementById('tilt_scale');
            var tiltScaleBase = tiltScaleOut.getBoundingClientRect();
            var tiltScalediv = document.getElementById('tilt_scalediv');
            var tiltScaleDivBase = tiltScalediv.getBoundingClientRect();
            var pointerMoveY = tiltScaleBase.height/135;
            pointer.style.transform = `translate(${tiltScaleDivBase.width}px, ${pointerMoveY*(90 - tiltNumMove)-tiltNumPanel.height/2}px)`;
          }
        }
    }
  }
  window.requestAnimationFrame(readGamepad);
}

window.requestAnimationFrame(readGamepad);

document.getElementById('open_jupyter').addEventListener('click', function() {
    var currentUrl = window.location.href;
    var newUrl = currentUrl.replace(/:(\d+)/, ':8888');
    window.open(newUrl, '_blank');
});
