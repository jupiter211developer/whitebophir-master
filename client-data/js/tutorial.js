const path = window.location.pathname.split('/');
const boardName = decodeURIComponent(path[path.length - 1]);
const server_config = JSON.parse(document.getElementById('configuration').text);

function initTutorial() {
    fetch(
        server_config.API_URL + 'boards/' +  boardName + '/info',
        {
            headers: new Headers({
                'Accept': 'application/json',
            }),
            method: 'GET',
            credentials: 'include',
        }
    )
        .then(response => response.json())
        .then(data => {
            Experrto.identify('bba17addd1ee8ea17fb6c9a0be6f209550feb84c', {
                email: data.user.email,
                username: data.user?.full_name,
                role: data.user.role
            });
            Experrto.ready(() => {
                Experrto.show(6134);
            });
        });
}

function searchParam() {
    return window.location.search
        .replace('?', '')
        .split('&')
        .map(item => {
            let sub_arr = item.split('=');
            return { key: sub_arr[0], value: sub_arr[1] }
        });
}

function checkParam(param, value) {
    return searchParam().some(x => x.key === param && x.value === value)
}

if (checkParam('tour', '1')) initTutorial();

// function initTutorial() {
//     const tutorial_step_count=4;
//     let current_step = 0;

//     const tutorial_elem = document.querySelector(".tutorial"),
//           tutorial_counter = tutorial_elem.querySelector(".tutorial__counter"),
//           tutorial_step_elem = [...document.querySelectorAll(".tutorial__text>li, body>.tutorial_panel")]
//               .map(item=> {return {id:Number(item.getAttribute("data-tutorial_step")), element:item}});
    

//     tutorial_elem.classList.add("start");
//     tutorial_elem.querySelectorAll(".tutorial__btn--next")
//         .forEach(item=>item.addEventListener("click",nextStep,false));
//     tutorial_elem.querySelectorAll(".tutorial__btn--end")
//         .forEach(item=>item.addEventListener("click",endTutorial,false));


//     function nextStep() {
//         if(current_step<tutorial_step_count) {
//             if(current_step===0)
//             {
//                 tutorial_elem.classList.add("active");
//             }
//             switchPanel();
//             current_step++;
//             tutorial_counter.innerText = `${current_step} / ${tutorial_step_count}`;
//             switchPanel();
//             if(current_step===tutorial_step_count){
//                 tutorial_elem.querySelector(".tutorial__start .tutorial__btn--next").innerText = "Начать работу";
//                 tutorial_elem.querySelector(".tutorial__start .tutorial__btn--end").style.display = "none";
//             }
//         }
//         else{
//             endTutorial();
//         }
//     }
    
//     function endTutorial() {
//         switchPanel();
//         tutorial_elem.remove();
//     }

//     function switchPanel() {
//         tutorial_step_elem.forEach(item=>{
//             if(item.id===current_step)
//                 item.element.classList.toggle("active")
//         });
//     }
// };

