(function () {
    let senderId;
    const socket = io();

    function generateID() {
        return `${Math.trunc(Math.random() * 9999)}-${Math.trunc(Math.random() * 9999)}-${Math.trunc(Math.random() * 9999)}`;
    }
    
    const modal = document.querySelector(".fs-modal");
    const filenameRequest = document.getElementById("filename-request");
    const acceptBtn = document.getElementById("accept-btn");
    const denyBtn = document.getElementById("deny-btn");
    const fileListContainer = document.querySelector(".file-list");

    document.querySelector("#receiver-start-con-btn").addEventListener("click", function () {
        senderId = document.querySelector("#join-id").value;
        if(senderId.length == 0)
            return;
        let joinId = generateID();
        
        socket.emit("receiver-join", { uid: joinId, sender_uid: senderId });
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".join-screen").classList.add("hidden");
        document.querySelector(".fs-screen").classList.remove("hidden");
        document.querySelector(".fs-screen").classList.add("active");
    }); 

    let fileShare = {};
    
    socket.on("fs-start-request", function(metadata){
        filenameRequest.textContent = `The sender wants to send you a file named "${metadata.filename}". Do you accept?`;
        modal.classList.remove("hidden");
        modal.classList.add("active");
        modal.classList.add("opacity-100");

        let handleAccept = function() {
            socket.emit("fs-start-response", { uid: senderId, accepted: true });
            modal.classList.remove("active");
            modal.classList.add("hidden");
            modal.classList.remove("opacity-100");
            acceptBtn.removeEventListener("click", handleAccept);
            denyBtn.removeEventListener("click", handleDeny);

            fileShare.metadata = metadata;
            fileShare.transmitted = 0;
            fileShare.buffer = [];
            
            let el = document.createElement("div");
            el.classList.add("item", "flex", "justify-between", "items-center", "p-4", "bg-gray-600", "rounded-xl", "mb-4");
            el.innerHTML = `
                <div class="filename text-gray-200">${metadata.filename}</div>
                <div class="progress font-bold text-lg text-blue-400">0%</div>`;
            fileListContainer.appendChild(el);
            fileShare.progress_node = el.querySelector(".progress");
            socket.emit("fs-share", { uid: senderId });
        };
        let handleDeny = function() {
            socket.emit("fs-start-response", { uid: senderId, accepted: false });
            modal.classList.remove("active");
            modal.classList.add("hidden");
            modal.classList.remove("opacity-100");
            acceptBtn.removeEventListener("click", handleAccept);
            denyBtn.removeEventListener("click", handleDeny);
            console.log("File transfer denied by receiver.");
            fileShare = {};
        };

        acceptBtn.addEventListener("click", handleAccept);
        denyBtn.addEventListener("click", handleDeny);
    });
    socket.on("fs-share", function(buffer){
        if (!fileShare.metadata || !fileShare.progress_node) {
            return;
        }

        fileShare.buffer.push(buffer);
        fileShare.transmitted += buffer.byteLength;
        fileShare.progress_node.innerText = `${Math.trunc(fileShare.transmitted / fileShare.metadata.total_buffer_size * 100)}%`;
        
        // FIX: Replaced the blob check with a direct check on the transmitted size
        if (fileShare.transmitted >= fileShare.metadata.total_buffer_size){
            download(new Blob(fileShare.buffer), fileShare.metadata.filename);
            fileShare.progress_node.innerText = "Complete";
            fileShare.progress_node.classList.remove("text-blue-400");
            fileShare.progress_node.classList.add("text-green-400");
            fileShare = {};
        } else {
            socket.emit("fs-share", { uid: senderId });
        }
    });
    function download(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
})();