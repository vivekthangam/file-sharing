(function () {
    let receiverId;
    const socket = io();
    let files = [];

    function generateID() {
        return `${Math.trunc(Math.random() * 9999)}-${Math.trunc(Math.random() * 9999)}-${Math.trunc(Math.random() * 9999)}`;
    }

    document.querySelector("#sender-start-con-btn").addEventListener("click", function () {
        let joinId = generateID();
        document.querySelector("#join-id").innerHTML = `
            <div class="mt-4 p-4 bg-gray-700 border border-yellow-500 rounded-xl text-yellow-300">
                <b>Room ID:</b> 
                <span class="font-mono text-xl block mt-2 select-all">${joinId}</span>
            </div>`;
        socket.emit("sender-join", { uid: joinId });
    });

    socket.on("init", function (data) {
        receiverId = data;
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".join-screen").classList.add("hidden");
        document.querySelector(".fs-screen").classList.remove("hidden");
        document.querySelector(".fs-screen").classList.add("active");
    });

    const fileInput = document.querySelector("#file-input");
    const fileDropdown = document.querySelector("#file-dropdown");
    const dropZone = document.querySelector("#drop-zone");
    function handleFiles(selectedFiles) {
        files = Array.from(selectedFiles);
        fileDropdown.innerHTML = '<option value="">-- Please select a file --</option>';
        files.forEach((file, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = file.name;
            fileDropdown.appendChild(option);
        });
    }

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#60a5fa";
    });
    dropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#4b5563";
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#4b5563";
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener("change", function (e) {
        handleFiles(e.target.files);
    });

    let fileShare = {};
    document.querySelector("#share-file-btn").addEventListener("click", function () {
        const selectedIndex = fileDropdown.value;
        if (selectedIndex === "") {
            alert("Please select a file to share.");
            return;
        }
        
        let file = files[selectedIndex];
        let reader = new FileReader();
      
        // This is the key fix. The transfer request is now inside the onload function.
        reader.onload = function (e) {
            let buffer = new Uint8Array(reader.result);
            let el = document.createElement("div");
            el.classList.add("item", "flex", "justify-between", "items-center", "p-4", "bg-gray-600", "rounded-xl", "mb-4");
            el.innerHTML = `
            <div class="filename text-gray-200">${file.name}</div>
            <div class="progress font-bold text-lg text-yellow-400">Waiting for receiver...</div>`;
            document.querySelector(".file-list").appendChild(el);

            fileShare.buffer = buffer;
            fileShare.metadata = {
                filename: file.name,
                total_buffer_size: buffer.length,
                buffer_size: 1024
            };
            fileShare.progress_node = el.querySelector(".progress");

            socket.emit("fs-start-request", {
                uid: receiverId,
                metadata: fileShare.metadata
            });
        };
        reader.readAsArrayBuffer(file);
    });

    socket.on("fs-start-response", function(accepted) {
        debugger
        if (!fileShare.progress_node) return;

        if (accepted) {
            fileShare.progress_node.innerText = "0%";
            fileShare.progress_node.classList.remove("text-yellow-400");
            fileShare.progress_node.classList.add("text-blue-400");
            sendNextChunk();
        } else {
            fileShare.progress_node.innerText = "Denied";
            fileShare.progress_node.classList.remove("text-yellow-400");
            fileShare.progress_node.classList.add("text-red-500");
            console.log("File transfer denied.");
            fileShare = {};
        }
    });
    socket.on("fs-share", function () {
        if (fileShare.buffer && fileShare.buffer.length > 0) {
            sendNextChunk();
        }
    });
    function sendNextChunk() {
        if (!fileShare.progress_node || !fileShare.buffer || !fileShare.metadata || isNaN(fileShare.metadata.total_buffer_size)) return;
        let chunk = fileShare.buffer.slice(0, fileShare.metadata.buffer_size);
        fileShare.buffer = fileShare.buffer.slice(fileShare.metadata.buffer_size, fileShare.buffer.length);
        debugger
        let progress = Math.trunc(((fileShare.metadata.total_buffer_size - fileShare.buffer.length) / fileShare.metadata.total_buffer_size) * 100);
        fileShare.progress_node.innerText = `${progress}%`;

        if (chunk.length !== 0) {
            socket.emit("file-raw", {
                uid: receiverId,
                buffer: chunk
            });
        } else {
            console.log("File transfer complete.");
            fileShare.progress_node.innerText = "Complete";
            fileShare.progress_node.classList.remove("text-blue-400");
            fileShare.progress_node.classList.add("text-green-400");
            fileShare = {};
        }
    }
})();