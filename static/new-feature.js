const agentOrg = false


async function api(path, options) {
  const res = await fetch(path, options);
  if (res.status === 401) {
    window.location.href = "/";
    throw new Error("unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) toss(data.detail || "Request failed");
  return data;
}

async function checkOrg(event){
    event.preventDefault();
    const orgName = document.getElementById("org-name").value.trim();
    const orgReg = document.getElementById("org-reg").value.trim();


    if (!orgName || !orgReg) {
        toss("Please fill in all fields.");
        return;
    }

    payload = {
        organization_name: orgName,
        organization_registration_number: orgReg,
    };
    const data = await api("/api/get-organization", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    

    if (data.status) {
        return {
            valid: true, 
            msg: "Organization created successfully!" 
        };
    } else {
        return {
          vaalid: false,
          msg: "Failed to create organization. Please try again.",
        };
    }
}

async function renderMyOrganization(){
    /* i added this function for one purpose that is to avoid repetition */
    function hide_and_show(elementToHide, elementToShow){
        elementToHide.classList.add("hidden");
        elementToShow.classList.remove("hidden");
    }
    
    /* check if the agent has an organization or not */
    const addOrg = document.getElementById("org-create-view");
    const orgView = document.getElementById("org-info-view");
     
    if(!agentOrg){
        addOrg.classList.remove("hidden");
        const formBox = document.getElementById("org-form")
        res = formBox.addEventListener("submit", checkOrg);

        if(res.valid){
            hide_and_show(addOrg, orgView);
        }
        
    }else{
        hide_and_show(addOrg, orgView);
    }
    
}
renderMyOrganization()