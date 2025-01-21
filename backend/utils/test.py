from land_value.data_manager import *
import io

def main():
    try:
        from terra_utils import Config
        config = Config('/home/ubuntu/terraview-django/backend/submodules/land_value/config')
    except Exception as e:
        print(f"Error loading Config: {e}")

    state = "maharashtra"
    district = "jalgaon"
    taluka = "parola"
    village = "mohadi"
    survey_no = 167
                
    all_manager_obj = all_manager()

    try:
        # Get the plot PDF directly as a bytes-like object
        pdf = all_manager_obj.get_plot_pdf(state, district, taluka, village, survey_no)

        # Write the PDF to a file
        with open("plot.pdf", "wb") as f:
            f.write(pdf.getvalue())  # Use getvalue() to retrieve the bytes from the BytesIO object
    except Exception as e:
        print(f"Error generating or saving the PDF: {e}")

if __name__ == "__main__":
    main()