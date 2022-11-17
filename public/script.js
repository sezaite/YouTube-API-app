const allInputFieldsContainer = document.querySelector(".all-inputs-container");
const loadingSpinner = document.querySelector(".loader");
const errorMessage = document.querySelector(".error-message");
let currentID = 0;
let enteredVideos = [];

const addRemoveButtons = () => {
    const allRemoveButtons = Array.from(document.querySelectorAll(".button--remove"));
    if (allRemoveButtons.length) {
       allRemoveButtons.forEach(button => {
            button.style.display = "block";
            button.addEventListener("click", ()=> {
                button.closest(".input-wrap").remove();
                if(allRemoveButtons.length < 3){
                  document.querySelector(".button--remove").style.display = "none";
                }
            })
        });
        
    }
}

const clearInputs = () => {
    const allInputFields = allInputFieldsContainer.querySelectorAll(".video-input");
    Array.from(allInputFields).forEach((input, index) => {
        if (!index) {
            input.value = "";
            input.closest(".input-wrap").querySelector(".button--remove").style.display = "none";
        } else {
            input.closest(".input-wrap").remove();
        }
    })
}


const createNewInput = () => {
    const inputWrap = document.createElement('div');
    inputWrap.classList.add("input-wrap");
    inputWrap.innerHTML = ` <label for="video-id">Video ID</label>
    <input type="text" id="video-id-${currentID}" class="video-input" value="" placeholder="Search for videos..."><button class="button--remove" type="button"></button>`
    allInputFieldsContainer.appendChild(inputWrap);
    currentID++;
    addRemoveButtons();
}

if (allInputFieldsContainer) {
    const addMoreButton =document.getElementById("add-more");
        addMoreButton.addEventListener("click", ()=>{
        const allInputFields = allInputFieldsContainer.querySelectorAll(".video-input");
        const emptyInputs = Array.from(allInputFields).filter(input => !input.value);
          if (emptyInputs.length) {
            emptyInputs[0].focus();
            return;
          } else {
            createNewInput();
          }
        })
}

const videoIdForm = document.getElementById("video-id-form");

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&apos;')
                      .replace(/[\u0800-\uFFFF]/g, '')
                      .replace(/\n/g, "<br />");
}

const formatData = (youTubeRawData) => {
    if (youTubeRawData.result.error) {
        if (youTubeRawData.result.error.code == "404") {

            return {
                error: "not found"
            };

        } else if (youTubeRawData.result.error.code == "403") {

            return {
                error: "comments are disabled"
            }
        }
    } else if (youTubeRawData.result.items.length === 0) {
        return {
            error: "there are no comments here"
        }
    } else {

        const returnedData = {
            videoId: youTubeRawData.result.items[0].snippet.videoId,
            comments: [] 
        }
        
        youTubeRawData.result.items.map(item => {
            const comment = {
                author: htmlEntities(item.snippet.topLevelComment.snippet.authorDisplayName),
                comment: htmlEntities(item.snippet.topLevelComment.snippet.textOriginal)
            }

            returnedData.comments.push(comment);
        })

        return returnedData;
    }
}

const saveData = (data) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = (e) => {
        if (e.target.status == "200") {
            console.log("Data was successfully cached.");
        } else {
            console.log("Something went wrong...");
        }
    }

    xhr.open("POST", "https://surfshark-youtube-video-app.herokuapp.com/save-video-data", true);
    // xhr.open("POST", "http://localhost:3002/save-video-data", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(data));
}

// Make sure the client is loaded before calling this method.
const executeYouTubeQuery = (videoId) => {
    return gapi.client.youtube.commentThreads.list({
        "part": [
            "snippet"
        ],
        "videoId": videoId
    })
        .then(function(response) {
            const data = formatData(response);
            saveData(data);
            addToList(data, false, videoId);
            },

            function(err) {
                const data = formatData(err);
                addToList(data, false, videoId);
            });
}

const loadClient = (videoId) => {
    gapi.client.setApiKey("AIzaSyAgxB2Cpjz3NBITpuQAwBJJ6xG2XMDI0dk");
    return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
        .then(function() { executeYouTubeQuery(videoId); },
              function(err) { console.error("Error loading GAPI client for API", err); });
}

const addToList = (data, isCached, videoId) => {
    if (!data.error && isCached) {
        data.comments = JSON.parse(data.comments);
    }
    
        const contentContainer = document.querySelector(".comments");
            if( contentContainer) {
                const containerHeader = contentContainer.querySelector("h2");
                containerHeader.style.display = "block";
                const videoBlock = document.createElement('div');
                videoBlock.classList.add("comments__video-block");
                if (!data.error) {
                let commentsList = "";
                for (let i = 0; i < data.comments.length; i++) {
                    commentsList += `<li>
                    <h5 class="comments__author">${data.comments[i].author}</h5>
                    <p class="comments__commment">${data.comments[i].comment}</p>
                </li>`
                }
                videoBlock.innerHTML= `
                    <div class="comments__video-title">
                        <h4>Video ID: <span>${data.videoId}</span></h4>
                        ${isCached ? "<h6>fetched from DataBase</h6>" : "<h6>fetched from YouTube API</h6>"}
                    </div>
                    <ul class="list-of-comments">
                        ${commentsList}
                    </ul>
                `
                loadingSpinner.after(videoBlock);
                loadingSpinner.style.display = "none";
            } else {
                videoBlock.innerHTML = `
                    <div class="comments__video-title">
                        <h4>Video ID: ${videoId} <span>${data.error}</span></h4>
                    </div>
                `
                loadingSpinner.after(videoBlock);
                loadingSpinner.style.display = "none";
            }
    } else {
        console.error("Error: container not found");
    }
clearInputs();

}

const queryYouTube = (videoId) => {
    loadClient(videoId);
}

const isAlreadyPrinted = (value) => {
   return enteredVideos.includes(value);
}

const getComments = (e) => {
    e.preventDefault();
    errorMessage.style.display = "none"
    let fieldValues = [];
    const fields = Array.from(videoIdForm.querySelectorAll("input[type='text']"));
    
    fields.forEach(field => {
        if(!isAlreadyPrinted(field.value)) {
            fieldValues.push(field.value);
            if (field.value !== "") {
                enteredVideos.push(field.value)
            }
        } else {
            errorMessage.style.display = "block"
            errorMessage.innerText = "Some of the query items are already in the list. The app doesn't display duplicates."
        }
    })

    const checkComments = (value) => {
        // App logic
        const xhr = new XMLHttpRequest();
        //const formData = new FormData();
        //formData.append("id", value);

        xhr.onload = (e) => {
            if (e.target.status == 200) {
                const data = JSON.parse(xhr.responseText);

                if (data.error) {

                    queryYouTube(value);

                } else {

                    addToList(data.data, true);
                }
            }
        }

        xhr.open("GET", `https://surfshark-youtube-video-app.herokuapp.com/check-database?id=${value}`, true);
        // xhr.open("GET", `http://localhost:3002/check-database?id=${value}`, true);
        xhr.send();

    }

    // Let's remove empty strings
    filteredFieldValues = fieldValues.filter(element => {
        return element !== '';
    });

    if (filteredFieldValues.length) {
        loadingSpinner.style.display = "block";
        loadingSpinner.scrollIntoView({behavior: "smooth", block: "center"})
        filteredFieldValues.forEach(value => {
            checkComments(value);
        })
    } else {
        if (errorMessage.style.display !== "block") {
            errorMessage.style.display = "block"
            errorMessage.innerText = "Please enter at least 1 video ID"
        }
    }

}

videoIdForm.addEventListener("submit", getComments);

// Let's load the gapi client
gapi.load("client");

